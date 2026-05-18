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
        CAPPluginMethod(name: "saveProgress", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPlayerKnowledge", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "settleDojoReward", returnType: CAPPluginReturnPromise)
    ]

    private let progressSchemaVersion = 1
    private let dojoDailyKnowledgePointDefaultLimit = 10

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

    @objc func getPlayerKnowledge(_ call: CAPPluginCall) {
#if canImport(FirebaseAuth) && canImport(FirebaseFirestore)
        ensureAnonymousUser { result in
            switch result {
            case .success:
                DispatchQueue.main.async {
                    self.performGetPlayerKnowledge(call)
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

    @objc func settleDojoReward(_ call: CAPPluginCall) {
#if canImport(FirebaseAuth) && canImport(FirebaseFirestore)
        ensureAnonymousUser { result in
            switch result {
            case .success:
                DispatchQueue.main.async {
                    self.performSettleDojoReward(call)
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
                print("[FirebaseBridge getProgress] raw Firestore progress")
                print("uid=\(uid)")
                print("knowledgePoints=nil")
                print("dailyKnowledgePointsEarned=nil")
                print("dailyKnowledgePointsDate=nil")
                print("hasDailyKnowledgePointsEarned=false")
                print("hasDailyKnowledgePointsDate=false")
                print("rawKeys=")
                call.resolve([
                    "exists": false
                ])
                return
            }

            let hasDailyKnowledgePointsEarned = data.keys.contains("dailyKnowledgePointsEarned")
            let hasDailyKnowledgePointsDate = data.keys.contains("dailyKnowledgePointsDate")
            let rawKnowledgePoints = data["knowledgePoints"] ?? data["sp"] ?? "nil"
            let rawDailyEarned = data["dailyKnowledgePointsEarned"] ?? "nil"
            let rawDailyDate = data["dailyKnowledgePointsDate"] ?? "nil"
            let rawKeys = data.keys.sorted().joined(separator: ",")
            print("[FirebaseBridge getProgress] raw Firestore progress")
            print("uid=\(uid)")
            print("knowledgePoints=\(rawKnowledgePoints)")
            print("dailyKnowledgePointsEarned=\(rawDailyEarned)")
            print("dailyKnowledgePointsDate=\(rawDailyDate)")
            print("hasDailyKnowledgePointsEarned=\(hasDailyKnowledgePointsEarned)")
            print("hasDailyKnowledgePointsDate=\(hasDailyKnowledgePointsDate)")
            print("rawKeys=\(rawKeys)")

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
        let containsKnowledgePoints = rawProgress.keys.contains("knowledgePoints")
        let containsDailyKnowledgePointsEarned = rawProgress.keys.contains("dailyKnowledgePointsEarned")
        let containsDailyKnowledgePointsDate = rawProgress.keys.contains("dailyKnowledgePointsDate")
        let containsProtectedFields = containsKnowledgePoints || containsDailyKnowledgePointsEarned || containsDailyKnowledgePointsDate
        let payloadKeys = progress.keys.sorted().joined(separator: ",")
        print("[FirebaseBridge saveProgress] write mode")
        print("mode=merge")
        print("payloadKeys=\(payloadKeys)")
        print("containsProtectedFields=\(containsProtectedFields)")

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

    private func performGetPlayerKnowledge(_ call: CAPPluginCall) {
        guard let uid = normalizedUid(from: call) else { return }
        let requestedDateKey = normalizedDateKey(call.getString("dateKey"), fallback: currentDateKey())
        let firestore = Firestore.firestore()
        let playerRef = Firestore
            .firestore()
            .collection("players")
            .document(uid)
        let progressRef = firestore
            .collection("users")
            .document(uid)
            .collection("progress")
            .document("main")

        playerRef.getDocument { snapshot, error in
            if let error {
                let nsError = error as NSError
                if self.isFirestorePermissionDenied(nsError) {
                    print("[FirebaseBridge getPlayerKnowledge] players/{uid} permission denied, fallback to users/{uid}/progress/main")
                    self.resolvePlayerKnowledgeFromProgressFallback(
                        call: call,
                        uid: uid,
                        requestedDateKey: requestedDateKey,
                        progressRef: progressRef
                    )
                    return
                }
                call.reject("讀取玩家知識點數失敗。", "firebase_player_knowledge_read_failed", nsError)
                return
            }

            let raw = snapshot?.data() ?? [:]
            let hasKnowledgePoints = raw.keys.contains("knowledgePoints")
            let hasDailyKnowledgePointsEarned = raw.keys.contains("dailyKnowledgePointsEarned")
            let hasDailyKnowledgePointsDate = raw.keys.contains("dailyKnowledgePointsDate")
            let rawKeys = raw.keys.sorted().joined(separator: ",")

            progressRef.getDocument { progressSnapshot, progressError in
                if let progressError {
                    print("[FirebaseBridge getPlayerKnowledge] fallback progress read failed: \(progressError.localizedDescription)")
                }

                let progressRaw = progressSnapshot?.data() ?? [:]
                let fallbackProgressSp = max(0, self.normalizeInt(progressRaw["sp"], fallback: 0))
                let knowledgePoints = max(0, self.normalizeInt(raw["knowledgePoints"], fallback: fallbackProgressSp))
                let storedDateKey = self.normalizedDateKey(raw["dailyKnowledgePointsDate"], fallback: requestedDateKey)
                let storedDailyEarned = max(0, self.normalizeInt(raw["dailyKnowledgePointsEarned"], fallback: 0))
                let effectiveDailyEarned = storedDateKey == requestedDateKey ? storedDailyEarned : 0
                let updatedAtMillis = self.serializeTimestampMillis(raw["updatedAt"])

                print("[FirebaseBridge getPlayerKnowledge] raw Firestore player")
                print("uid=\(uid)")
                print("knowledgePoints=\(knowledgePoints)")
                print("dailyKnowledgePointsEarned=\(effectiveDailyEarned)")
                print("dailyKnowledgePointsDate=\(storedDateKey)")
                print("hasKnowledgePoints=\(hasKnowledgePoints)")
                print("hasDailyKnowledgePointsEarned=\(hasDailyKnowledgePointsEarned)")
                print("hasDailyKnowledgePointsDate=\(hasDailyKnowledgePointsDate)")
                print("fallbackProgressSp=\(fallbackProgressSp)")
                print("rawKeys=\(rawKeys)")

                call.resolve([
                    "uid": uid,
                    "meta": [
                        "hasKnowledgePoints": hasKnowledgePoints,
                        "hasDailyKnowledgePointsEarned": hasDailyKnowledgePointsEarned,
                        "hasDailyKnowledgePointsDate": hasDailyKnowledgePointsDate,
                        "fallbackProgressSp": fallbackProgressSp,
                        "rawKeys": rawKeys,
                        "source": "players"
                    ],
                    "data": [
                        "knowledgePoints": knowledgePoints,
                        "dailyKnowledgePointsEarned": effectiveDailyEarned,
                        "dailyKnowledgePointsDate": hasDailyKnowledgePointsDate ? storedDateKey : "",
                        "updatedAt": updatedAtMillis
                    ]
                ])
            }
        }
    }

    private func performSettleDojoReward(_ call: CAPPluginCall) {
        guard let uid = normalizedUid(from: call) else { return }

        let calculatedReward = max(0, normalizeInt(call.getInt("calculatedReward"), fallback: 0))
        let requestedLimit = max(0, normalizeInt(call.getInt("dailyKnowledgePointLimit"), fallback: dojoDailyKnowledgePointDefaultLimit))
        let dailyLimit = max(1, requestedLimit)
        let targetDateKey = normalizedDateKey(call.getString("dateKey"), fallback: currentDateKey())
        let mode = String(call.getString("mode") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let correctCount = max(0, normalizeInt(call.getInt("correctCount"), fallback: 0))
        let totalQuestions = max(0, normalizeInt(call.getInt("totalQuestions"), fallback: 0))
        let baselineDailyKnowledgePointsEarned = max(
            0,
            normalizeInt(call.getInt("baselineDailyKnowledgePointsEarned"), fallback: 0)
        )
        let baselineDailyKnowledgePointsDate = normalizedDateKey(
            call.getString("baselineDailyKnowledgePointsDate"),
            fallback: ""
        )
        let firestore = Firestore.firestore()
        let playerRef = Firestore
            .firestore()
            .collection("players")
            .document(uid)
        let progressRef = firestore
            .collection("users")
            .document(uid)
            .collection("progress")
            .document("main")
        print("[KnowledgeDojoTransaction] claim request uid=\(uid) mode=\(mode.isEmpty ? "unknown" : mode) correctCount=\(correctCount) totalQuestions=\(totalQuestions) calculatedReward=\(calculatedReward)")

        Firestore.firestore().runTransaction({ transaction, errorPointer -> Any? in
            var current: [String: Any] = [:]
            var useProgressFallback = false
            do {
                let snapshot = try transaction.getDocument(playerRef)
                current = snapshot.data() ?? [:]
            } catch let fetchError as NSError {
                if self.isFirestorePermissionDenied(fetchError) {
                    useProgressFallback = true
                    current = [:]
                    print("[KnowledgeDojoTransaction] players/{uid} permission denied, fallback to users/{uid}/progress/main")
                } else {
                    errorPointer?.pointee = fetchError
                    return nil
                }
            }

            var fallbackProgressSp = 0
            var progressRaw: [String: Any] = [:]
            do {
                let progressSnapshot = try transaction.getDocument(progressRef)
                progressRaw = progressSnapshot.data() ?? [:]
                fallbackProgressSp = max(0, self.normalizeInt(progressRaw["sp"], fallback: 0))
            } catch let progressReadError as NSError {
                errorPointer?.pointee = progressReadError
                return nil
            }
            let progressStats = progressRaw["stats"] as? [String: Any] ?? [:]
            let progressDateKey = self.normalizedDateKey(progressStats["dailyKnowledgePointsDate"], fallback: "")
            let progressDailyEarned = max(0, self.normalizeInt(progressStats["dailyKnowledgePointsEarned"], fallback: 0))
            let hasProgressDailySnapshot = !progressDateKey.isEmpty

            let hasStoredDailyEarned = current.keys.contains("dailyKnowledgePointsEarned")
            let hasStoredDailyDate = current.keys.contains("dailyKnowledgePointsDate")
            let storedDateKey = self.normalizedDateKey(current["dailyKnowledgePointsDate"], fallback: "")
            let storedDailyEarned = max(0, self.normalizeInt(current["dailyKnowledgePointsEarned"], fallback: 0))
            let hasStoredDailySnapshot = hasStoredDailyEarned && hasStoredDailyDate && !storedDateKey.isEmpty

            useProgressFallback = useProgressFallback || current.isEmpty
            let currentKnowledgePoints = useProgressFallback
                ? max(0, fallbackProgressSp)
                : max(0, self.normalizeInt(current["knowledgePoints"], fallback: fallbackProgressSp))

            let effectiveDailyEarned: Int
            let dailySource: String
            if hasStoredDailySnapshot {
                effectiveDailyEarned = storedDateKey == targetDateKey
                    ? min(dailyLimit, storedDailyEarned)
                    : 0
                dailySource = "firebase"
            } else if hasProgressDailySnapshot && progressDateKey == targetDateKey {
                effectiveDailyEarned = min(dailyLimit, progressDailyEarned)
                dailySource = "progress"
            } else if baselineDailyKnowledgePointsDate == targetDateKey {
                effectiveDailyEarned = min(dailyLimit, baselineDailyKnowledgePointsEarned)
                dailySource = "baseline"
            } else {
                effectiveDailyEarned = 0
                dailySource = "baseline"
            }

            let remaining = max(0, dailyLimit - effectiveDailyEarned)
            let actualReward = min(calculatedReward, remaining)
            let updatedKnowledgePoints = currentKnowledgePoints + actualReward
            let updatedDailyEarned = effectiveDailyEarned + actualReward
            print("[KnowledgeDojoTransaction] before")
            print("knowledgePoints=\(currentKnowledgePoints)")
            print("dailyKnowledgePointsEarned=\(effectiveDailyEarned)")
            print("dailyKnowledgePointsDate=\(storedDateKey.isEmpty ? targetDateKey : storedDateKey)")
            print("today=\(targetDateKey)")
            print("remaining=\(remaining)")
            print("calculatedReward=\(calculatedReward)")
            print("dailySource=\(dailySource)")
            print("baselineDailyKnowledgePointsEarned=\(baselineDailyKnowledgePointsEarned)")
            print("baselineDailyKnowledgePointsDate=\(baselineDailyKnowledgePointsDate)")

            if useProgressFallback {
                var updatedStats = progressStats
                updatedStats["dailyKnowledgePointsEarned"] = updatedDailyEarned
                updatedStats["dailyKnowledgePointsDate"] = targetDateKey
                transaction.setData([
                    "sp": updatedKnowledgePoints,
                    "stats": updatedStats,
                    "updatedAt": FieldValue.serverTimestamp()
                ], forDocument: progressRef, merge: true)
            } else {
                transaction.setData([
                    "knowledgePoints": updatedKnowledgePoints,
                    "dailyKnowledgePointsEarned": updatedDailyEarned,
                    "dailyKnowledgePointsDate": targetDateKey,
                    "updatedAt": FieldValue.serverTimestamp()
                ], forDocument: playerRef)
            }

            return [
                "knowledgePoints": updatedKnowledgePoints,
                "dailyKnowledgePointsEarned": updatedDailyEarned,
                "dailyKnowledgePointsDate": targetDateKey,
                "actualReward": actualReward,
                "remaining": max(0, dailyLimit - updatedDailyEarned),
                "updatedAt": Int64(Date().timeIntervalSince1970 * 1000)
            ]
        }, completion: { object, error in
            if let error {
                call.reject("知識道場獎勵結算失敗。", "firebase_dojo_settlement_failed", error as NSError)
                return
            }

            guard let payload = object as? [String: Any] else {
                call.reject("知識道場獎勵結算失敗：缺少交易結果。", "firebase_dojo_settlement_empty")
                return
            }

            let knowledgePoints = max(0, self.normalizeInt(payload["knowledgePoints"], fallback: 0))
            let dailyKnowledgePointsEarned = max(0, self.normalizeInt(payload["dailyKnowledgePointsEarned"], fallback: 0))
            let dailyKnowledgePointsDate = self.normalizedDateKey(payload["dailyKnowledgePointsDate"], fallback: targetDateKey)
            let actualReward = max(0, self.normalizeInt(payload["actualReward"], fallback: 0))
            let remaining = max(0, self.normalizeInt(payload["remaining"], fallback: 0))
            let updatedAt = self.serializeTimestampMillis(payload["updatedAt"])
            print("[KnowledgeDojoTransaction] after")
            print("actualReward=\(actualReward)")
            print("knowledgePoints=\(knowledgePoints)")
            print("dailyKnowledgePointsEarned=\(dailyKnowledgePointsEarned)")
            print("dailyKnowledgePointsDate=\(dailyKnowledgePointsDate)")
            print("dailyLimit=\(dailyLimit)")

            call.resolve([
                "uid": uid,
                "actualReward": actualReward,
                "remaining": remaining,
                "data": [
                    "knowledgePoints": knowledgePoints,
                    "dailyKnowledgePointsEarned": dailyKnowledgePointsEarned,
                    "dailyKnowledgePointsDate": dailyKnowledgePointsDate,
                    "updatedAt": updatedAt
                ]
            ])
        })
    }

    private func resolvePlayerKnowledgeFromProgressFallback(
        call: CAPPluginCall,
        uid: String,
        requestedDateKey: String,
        progressRef: DocumentReference
    ) {
        progressRef.getDocument { snapshot, error in
            if let error {
                call.reject("讀取玩家知識點數失敗。", "firebase_player_knowledge_read_failed", error as NSError)
                return
            }

            let raw = snapshot?.data() ?? [:]
            let stats = raw["stats"] as? [String: Any] ?? [:]
            let knowledgePoints = max(0, self.normalizeInt(raw["sp"], fallback: 0))
            let storedDateKey = self.normalizedDateKey(stats["dailyKnowledgePointsDate"], fallback: "")
            let storedDailyEarned = max(0, self.normalizeInt(stats["dailyKnowledgePointsEarned"], fallback: 0))
            let effectiveDailyEarned = storedDateKey == requestedDateKey ? storedDailyEarned : 0
            let updatedAtMillis = self.serializeTimestampMillis(raw["updatedAt"])

            print("[FirebaseBridge getPlayerKnowledge] fallback progress snapshot")
            print("uid=\(uid)")
            print("knowledgePoints=\(knowledgePoints)")
            print("dailyKnowledgePointsEarned=\(effectiveDailyEarned)")
            print("dailyKnowledgePointsDate=\(storedDateKey)")

            call.resolve([
                "uid": uid,
                "meta": [
                    "hasKnowledgePoints": true,
                    "hasDailyKnowledgePointsEarned": !storedDateKey.isEmpty,
                    "hasDailyKnowledgePointsDate": !storedDateKey.isEmpty,
                    "fallbackProgressSp": knowledgePoints,
                    "rawKeys": raw.keys.sorted().joined(separator: ","),
                    "source": "progress_fallback"
                ],
                "data": [
                    "knowledgePoints": knowledgePoints,
                    "dailyKnowledgePointsEarned": effectiveDailyEarned,
                    "dailyKnowledgePointsDate": storedDateKey,
                    "updatedAt": updatedAtMillis
                ]
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

    private func normalizedDateKey(_ value: Any?, fallback: String) -> String {
        let text = String(describing: value ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if text.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil {
            return text
        }
        return fallback
    }

    private func currentDateKey() -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    private func serializeTimestampMillis(_ value: Any?) -> Int64 {
        if let timestamp = value as? Timestamp {
            return Int64(timestamp.dateValue().timeIntervalSince1970 * 1000)
        }
        if let number = value as? NSNumber {
            return number.int64Value
        }
        if let text = value as? String, let parsed = Int64(text) {
            return parsed
        }
        return 0
    }

    private func isFirestorePermissionDenied(_ error: NSError) -> Bool {
        if error.domain == FirestoreErrorDomain
            && error.code == FirestoreErrorCode.permissionDenied.rawValue {
            return true
        }
        return error.localizedDescription.lowercased().contains("permission")
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
