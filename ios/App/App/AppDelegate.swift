import UIKit
import Capacitor
import AVFoundation
import GameKit
import FirebaseCore
#if canImport(FirebaseAuth)
import FirebaseAuth
#endif
#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        let configured = FirebaseApp.app() != nil
        print("✅ Firebase configured: \(configured)")
#if DEBUG
        if configured {
            runFirebaseConnectivityDiagnostics()
        }
#endif

        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to activate audio session: \(error)")
        }

        return true
    }

    private func runFirebaseConnectivityDiagnostics() {
#if canImport(FirebaseAuth)
        print("ℹ️ FirebaseAuth linked.")
#else
        print("ℹ️ FirebaseAuth not linked.")
#endif

#if canImport(FirebaseFirestore)
        print("ℹ️ FirebaseFirestore linked.")
#else
        print("ℹ️ FirebaseFirestore not linked.")
#endif
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

@objc(MyViewController)
class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(GameCenterBridgePlugin())
        bridge?.registerPluginInstance(FirebaseBridgePlugin())
    }
}

@objc(GameCenterBridgePlugin)
class GameCenterBridgePlugin: CAPPlugin, CAPBridgedPlugin, GKMatchDelegate {
    let identifier = "GameCenterBridgePlugin"
    let jsName = "GameCenterBridge"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getLocalPlayer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startMatchmaking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelMatchmaking", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendMatchData", returnType: CAPPluginReturnPromise)
    ]

    private var pendingAuthCalls: [CAPPluginCall] = []
    private var isAuthInProgress = false
    private var shouldPresentAuthUI = false
    private var isPresentingAuthUI = false
    private var pendingMatchCall: CAPPluginCall?
    private var currentMatch: GKMatch?

    @objc func getLocalPlayer(_ call: CAPPluginCall) {
        call.resolve(playerStatePayload())
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.authenticateLocalPlayer(interactive: true, call: call)
        }
    }

    @objc func startMatchmaking(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard GKLocalPlayer.local.isAuthenticated else {
                call.reject("Game Center 尚未登入。")
                return
            }
            self.currentMatch = nil
            if self.pendingMatchCall != nil {
                call.reject("配對已在進行中。")
                return
            }

            let minPlayers = max(2, call.getInt("minPlayers") ?? 2)
            let maxPlayers = max(minPlayers, call.getInt("maxPlayers") ?? 2)

            let request = GKMatchRequest()
            request.minPlayers = minPlayers
            request.maxPlayers = maxPlayers

            self.pendingMatchCall = call
            self.notifyListeners("matchStateChange", data: [
                "phase": "searching",
                "message": "正在搜尋對手..."
            ])

            GKMatchmaker.shared().findMatch(for: request) { [weak self] match, error in
                guard let self else { return }
                DispatchQueue.main.async {
                    guard self.pendingMatchCall != nil else { return }

                    if let error {
                        let pendingCall = self.pendingMatchCall
                        self.pendingMatchCall = nil
                        let nsError = error as NSError
                        if nsError.domain == GKErrorDomain && nsError.code == GKError.Code.cancelled.rawValue {
                            self.notifyListeners("matchStateChange", data: [
                                "phase": "idle",
                                "message": "已取消配對。"
                            ])
                            pendingCall?.reject("已取消配對。", "cancelled", nsError)
                            return
                        }
                        self.notifyListeners("matchStateChange", data: [
                            "phase": "error",
                            "message": "配對失敗。",
                            "errorMessage": nsError.localizedDescription
                        ])
                        pendingCall?.reject("配對失敗。", "matchmaking_error", nsError)
                        return
                    }

                    guard let match else {
                        let pendingCall = self.pendingMatchCall
                        self.pendingMatchCall = nil
                        self.notifyListeners("matchStateChange", data: [
                            "phase": "error",
                            "message": "配對失敗。",
                            "errorMessage": "Game Center 沒有回傳對戰資料。"
                        ])
                        pendingCall?.reject("配對失敗。", "empty_match")
                        return
                    }

                    self.currentMatch = match
                    match.delegate = self
                    GKMatchmaker.shared().finishMatchmaking(for: match)
                    self.notifyMatchConnectingState(for: match)
                    self.finalizeMatchedStateIfReady(for: match)
                }
            }
        }
    }

    @objc func cancelMatchmaking(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            GKMatchmaker.shared().cancel()

            if let activeMatch = self.currentMatch {
                activeMatch.disconnect()
                self.currentMatch = nil
            }

            if let pendingCall = self.pendingMatchCall {
                self.pendingMatchCall = nil
                pendingCall.reject("已取消配對。", "cancelled")
            }

            self.notifyListeners("matchStateChange", data: [
                "phase": "idle",
                "message": "已取消配對。"
            ])
            call.resolve()
        }
    }

    @objc func sendMatchData(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard GKLocalPlayer.local.isAuthenticated else {
                call.reject("Game Center 尚未登入。")
                return
            }
            guard let match = self.currentMatch else {
                call.reject("目前沒有可用的對戰連線。", "match_unavailable")
                return
            }
            if match.expectedPlayerCount > 0 || match.players.isEmpty {
                call.reject("對戰連線尚未完成，請稍候。", "match_not_ready")
                return
            }
            guard let payload = call.getObject("payload"), JSONSerialization.isValidJSONObject(payload) else {
                call.reject("缺少有效的 payload。", "invalid_payload")
                return
            }

            do {
                let data = try JSONSerialization.data(withJSONObject: payload, options: [])
                let mode: GKMatch.SendDataMode = (call.getBool("reliable") ?? true) ? .reliable : .unreliable
                try match.sendData(toAllPlayers: data, with: mode)
                call.resolve()
            } catch {
                let nsError = error as NSError
                call.reject("送出對戰資料失敗。", "send_data_error", nsError)
            }
        }
    }

    private func authenticateLocalPlayer(interactive: Bool, call: CAPPluginCall) {
        if GKLocalPlayer.local.isAuthenticated {
            call.resolve(playerStatePayload())
            return
        }
        pendingAuthCalls.append(call)
        shouldPresentAuthUI = shouldPresentAuthUI || interactive
        if isAuthInProgress {
            return
        }
        isAuthInProgress = true

        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
            guard let self else { return }
            DispatchQueue.main.async {
                if let viewController {
                    let host = self.bridge?.viewController
                    if self.shouldPresentAuthUI
                        && !self.isPresentingAuthUI
                        && host?.presentedViewController == nil {
                        self.isPresentingAuthUI = true
                        host?.present(viewController, animated: true) {
                            self.isPresentingAuthUI = false
                        }
                    }
                    return
                }

                self.isAuthInProgress = false
                self.shouldPresentAuthUI = false
                self.isPresentingAuthUI = false

                let pendingCalls = self.pendingAuthCalls
                self.pendingAuthCalls.removeAll()
                if pendingCalls.isEmpty { return }

                if let error {
                    let nsError = error as NSError
                    for pendingCall in pendingCalls {
                        pendingCall.reject("Game Center 登入失敗。", "auth_error", nsError)
                    }
                    return
                }

                let payload = self.playerStatePayload()
                for pendingCall in pendingCalls {
                    pendingCall.resolve(payload)
                }
            }
        }
    }

    private func playerStatePayload() -> JSObject {
        let local = GKLocalPlayer.local
        return [
            "isAuthenticated": local.isAuthenticated,
            "player": local.isAuthenticated ? [
                "id": local.gamePlayerID,
                "gameCenterId": local.teamPlayerID,
                "displayName": local.displayName,
                "alias": local.alias,
                "avatarEmoji": "🎮"
            ] : [:]
        ]
    }

    private func resolveOpponentPayload(from player: GKPlayer?) -> JSObject {
        guard let player else {
            return [
                "id": "pending-opponent",
                "gameCenterId": "",
                "displayName": "對手連線中",
                "avatarEmoji": "🥷"
            ]
        }
        return [
            "id": player.gamePlayerID,
            "gameCenterId": player.teamPlayerID,
            "displayName": player.displayName,
            "avatarEmoji": "🥷"
        ]
    }

    private func notifyMatchConnectingState(for match: GKMatch) {
        let expected = max(0, match.expectedPlayerCount)
        let opponent = resolveOpponentPayload(from: match.players.first)
        let message = expected > 0
            ? "配對成功，等待對手連線完成..."
            : "配對成功，正在建立戰鬥同步..."
        notifyListeners("matchStateChange", data: [
            "phase": "searching",
            "message": message,
            "opponentProfile": opponent,
            "expectedPlayerCount": expected,
            "connectedPlayerCount": match.players.count
        ])
    }

    private func finalizeMatchedStateIfReady(for match: GKMatch) {
        guard let activeMatch = currentMatch, activeMatch === match else { return }
        if match.expectedPlayerCount > 0 {
            notifyMatchConnectingState(for: match)
            return
        }

        let opponent = resolveOpponentPayload(from: match.players.first)
        notifyListeners("matchStateChange", data: [
            "phase": "matched",
            "message": "配對完成，請雙方準備後開始對戰。",
            "opponentProfile": opponent,
            "expectedPlayerCount": 0,
            "connectedPlayerCount": match.players.count
        ])

        if let pendingCall = pendingMatchCall {
            pendingMatchCall = nil
            pendingCall.resolve([
                "matchId": match.description,
                "opponentProfile": opponent
            ])
        }
    }

    func match(_ match: GKMatch, didReceive data: Data, fromRemotePlayer player: GKPlayer) {
        DispatchQueue.main.async {
            var packet: JSObject = [
                "fromPlayerId": player.gamePlayerID,
                "fromDisplayName": player.displayName
            ]

            if let jsonText = String(data: data, encoding: .utf8) {
                let sanitizedText = jsonText
                    .replacingOccurrences(of: "\u{0000}", with: "")
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                packet["payload"] = [
                    "type": "raw_json_text",
                    "json": sanitizedText
                ]
            } else {
                packet["payload"] = [
                    "type": "raw",
                    "dataBase64": data.base64EncodedString()
                ]
            }

            self.notifyListeners("matchData", data: packet)
        }
    }

    func match(_ match: GKMatch, player: GKPlayer, didChange state: GKPlayerConnectionState) {
        if state == .connected {
            notifyListeners("matchPlayerStateChange", data: [
                "playerId": player.gamePlayerID,
                "state": "connected",
                "expectedPlayerCount": max(0, match.expectedPlayerCount),
                "connectedPlayerCount": match.players.count
            ])
            finalizeMatchedStateIfReady(for: match)
            return
        }
        if state == .disconnected {
            if let activeMatch = currentMatch, activeMatch === match {
                currentMatch = nil
            }
            if let pendingCall = pendingMatchCall {
                pendingMatchCall = nil
                pendingCall.reject("配對連線中斷。", "peer_disconnected")
            }
            notifyListeners("matchPlayerStateChange", data: [
                "playerId": player.gamePlayerID,
                "state": "disconnected",
                "expectedPlayerCount": max(0, match.expectedPlayerCount),
                "connectedPlayerCount": match.players.count
            ])
        }
    }

    func match(_ match: GKMatch, didFailWithError error: Error?) {
        if let activeMatch = currentMatch, activeMatch === match {
            currentMatch = nil
        }
        if let pendingCall = pendingMatchCall {
            pendingMatchCall = nil
            pendingCall.reject("配對連線中斷。", "match_connection_failed", error as NSError?)
        }
        let message = (error as NSError?)?.localizedDescription ?? "未知錯誤"
        notifyListeners("matchStateChange", data: [
            "phase": "error",
            "message": "對戰連線中斷。",
            "errorMessage": message
        ])
    }
}

@objc(FirebaseBridgePlugin)
class FirebaseBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "FirebaseBridgePlugin"
    let jsName = "FirebaseBridge"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticateAnonymous", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "upsertUser", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProgress", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveProgress", returnType: CAPPluginReturnPromise)
    ]

    private let progressSchemaVersion = 1

    @objc func authenticateAnonymous(_ call: CAPPluginCall) {
#if canImport(FirebaseAuth)
        ensureAnonymousUser { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let user):
                    call.resolve([
                        "uid": user.uid,
                        "isAnonymous": user.isAnonymous,
                        "isAuthenticated": true
                    ])
                case .failure(let error):
                    call.reject("Firebase 匿名登入失敗。", "firebase_auth_failed", error as NSError)
                }
            }
        }
#else
        call.reject("FirebaseAuth 尚未連結。", "firebase_auth_unavailable")
#endif
    }

    @objc func upsertUser(_ call: CAPPluginCall) {
#if canImport(FirebaseAuth) && canImport(FirebaseFirestore)
        ensureAnonymousUser { result in
            switch result {
            case .success:
                DispatchQueue.main.async {
                    self.performUpsertUser(call)
                }
            case .failure(let error):
                DispatchQueue.main.async {
                    call.reject("Firebase 匿名登入失敗。", "firebase_auth_failed", error as NSError)
                }
            }
        }
#else
        call.reject("FirebaseAuth 或 FirebaseFirestore 尚未連結。", "firebase_services_unavailable")
#endif
    }

    @objc func getProgress(_ call: CAPPluginCall) {
#if canImport(FirebaseAuth) && canImport(FirebaseFirestore)
        ensureAnonymousUser { result in
            switch result {
            case .success:
                DispatchQueue.main.async {
                    self.performGetProgress(call)
                }
            case .failure(let error):
                DispatchQueue.main.async {
                    call.reject("Firebase 匿名登入失敗。", "firebase_auth_failed", error as NSError)
                }
            }
        }
#else
        call.reject("FirebaseAuth 或 FirebaseFirestore 尚未連結。", "firebase_services_unavailable")
#endif
    }

    @objc func saveProgress(_ call: CAPPluginCall) {
#if canImport(FirebaseAuth) && canImport(FirebaseFirestore)
        ensureAnonymousUser { result in
            switch result {
            case .success:
                DispatchQueue.main.async {
                    self.performSaveProgress(call)
                }
            case .failure(let error):
                DispatchQueue.main.async {
                    call.reject("Firebase 匿名登入失敗。", "firebase_auth_failed", error as NSError)
                }
            }
        }
#else
        call.reject("FirebaseAuth 或 FirebaseFirestore 尚未連結。", "firebase_services_unavailable")
#endif
    }

#if canImport(FirebaseAuth)
    private func ensureAnonymousUser(completion: @escaping (Result<User, Error>) -> Void) {
        DispatchQueue.main.async {
            if let currentUser = Auth.auth().currentUser {
                completion(.success(currentUser))
                return
            }
            Auth.auth().signInAnonymously { authResult, error in
                if let error {
                    completion(.failure(error))
                    return
                }
                guard let user = authResult?.user else {
                    completion(.failure(NSError(
                        domain: "FirebaseBridge",
                        code: -1,
                        userInfo: [NSLocalizedDescriptionKey: "Firebase 沒有回傳使用者資料。"]
                    )))
                    return
                }
                completion(.success(user))
            }
        }
    }
#endif

#if canImport(FirebaseFirestore)
    private func performUpsertUser(_ call: CAPPluginCall) {
        guard let uid = normalizedUid(from: call) else { return }

        let gameCenterPlayerId = call.getString("gameCenterPlayerId") ?? ""
        let displayName = call.getString("displayName") ?? ""
        let alias = call.getString("alias") ?? ""

        let userRef = Firestore.firestore().collection("users").document(uid)
        userRef.getDocument { snapshot, error in
            if let error {
                call.reject("讀取使用者資料失敗。", "firebase_user_read_failed", error as NSError)
                return
            }

            var payload: [String: Any] = [
                "uid": uid,
                "gameCenterPlayerId": gameCenterPlayerId,
                "displayName": displayName,
                "alias": alias,
                "updatedAt": FieldValue.serverTimestamp(),
                "lastLoginAt": FieldValue.serverTimestamp()
            ]
            if snapshot?.exists != true {
                payload["createdAt"] = FieldValue.serverTimestamp()
            }

            userRef.setData(payload, merge: true) { writeError in
                if let writeError {
                    call.reject("寫入使用者資料失敗。", "firebase_user_write_failed", writeError as NSError)
                    return
                }
                call.resolve([
                    "uid": uid,
                    "written": true
                ])
            }
        }
    }

    private func performGetProgress(_ call: CAPPluginCall) {
        guard let uid = normalizedUid(from: call) else { return }
        let progressRef = Firestore
            .firestore()
            .collection("users")
            .document(uid)
            .collection("progress")
            .document("main")

        progressRef.getDocument { snapshot, error in
            if let error {
                call.reject("讀取進度資料失敗。", "firebase_progress_read_failed", error as NSError)
                return
            }

            guard let snapshot, snapshot.exists, let data = snapshot.data() else {
                call.resolve([
                    "exists": false
                ])
                return
            }

            call.resolve([
                "exists": true,
                "data": self.serializeFirestoreMap(data)
            ])
        }
    }

    private func performSaveProgress(_ call: CAPPluginCall) {
        guard let uid = normalizedUid(from: call) else { return }
        guard let rawProgress = call.getObject("progress") else {
            call.reject("缺少 progress payload。", "firebase_progress_payload_missing")
            return
        }

        let progress = sanitizeProgressPayload(rawProgress)
        let progressRef = Firestore
            .firestore()
            .collection("users")
            .document(uid)
            .collection("progress")
            .document("main")

        progressRef.setData(progress, merge: true) { error in
            if let error {
                call.reject("寫入進度資料失敗。", "firebase_progress_write_failed", error as NSError)
                return
            }
            call.resolve([
                "uid": uid,
                "saved": true
            ])
        }
    }

    private func sanitizeProgressPayload(_ raw: [String: Any]) -> [String: Any] {
        let level = normalizeInt(raw["level"], fallback: 0)
        let sp = normalizeInt(raw["sp"], fallback: 0)
        let learnedSkills = normalizeStringArray(raw["learnedSkills"])
        let equippedSkills = normalizeStringArray(raw["equippedSkills"])
        let stats = normalizeMap(raw["stats"])
        let stageProgress = normalizeMap(raw["stageProgress"])
        let questionProgress = normalizeMap(raw["questionProgress"])
        let schemaVersion = normalizeInt(raw["schemaVersion"], fallback: progressSchemaVersion)

        return [
            "level": level,
            "sp": sp,
            "learnedSkills": learnedSkills,
            "equippedSkills": equippedSkills,
            "stats": stats,
            "stageProgress": stageProgress,
            "questionProgress": questionProgress,
            "schemaVersion": schemaVersion,
            "updatedAt": FieldValue.serverTimestamp()
        ]
    }

    private func normalizedUid(from call: CAPPluginCall) -> String? {
        let uid = String(call.getString("uid") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if !uid.isEmpty { return uid }
#if canImport(FirebaseAuth)
        if let currentUid = Auth.auth().currentUser?.uid, !currentUid.isEmpty {
            return currentUid
        }
#endif
        call.reject("缺少 uid。", "firebase_uid_missing")
        return nil
    }

    private func normalizeInt(_ value: Any?, fallback: Int) -> Int {
        if let number = value as? NSNumber {
            return number.intValue
        }
        if let text = value as? String, let parsed = Int(text) {
            return parsed
        }
        return fallback
    }

    private func normalizeStringArray(_ value: Any?) -> [String] {
        guard let list = value as? [Any] else { return [] }
        var seen = Set<String>()
        return list.compactMap { item -> String? in
            let text: String
            if let raw = item as? String {
                text = raw
            } else if let num = item as? NSNumber {
                text = num.stringValue
            } else {
                return nil
            }
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty || seen.contains(trimmed) {
                return nil
            }
            seen.insert(trimmed)
            return trimmed
        }
    }

    private func normalizeMap(_ value: Any?) -> [String: Any] {
        guard let map = value as? [String: Any] else { return [:] }
        return map
    }

    private func serializeFirestoreMap(_ raw: [String: Any]) -> [String: Any] {
        var result: [String: Any] = [:]
        for (key, value) in raw {
            result[key] = serializeFirestoreValue(value)
        }
        return result
    }

    private func serializeFirestoreValue(_ value: Any) -> Any {
        if let timestamp = value as? Timestamp {
            return Int64(timestamp.dateValue().timeIntervalSince1970 * 1000)
        }
        if let map = value as? [String: Any] {
            return serializeFirestoreMap(map)
        }
        if let list = value as? [Any] {
            return list.map { serializeFirestoreValue($0) }
        }
        return value
    }
#endif
}
