import UIKit
import Capacitor
import AVFoundation
import GameKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to activate audio session: \(error)")
        }

        return true
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
        CAPPluginMethod(name: "cancelMatchmaking", returnType: CAPPluginReturnPromise)
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
                    guard let pendingCall = self.pendingMatchCall else { return }

                    if let error {
                        self.pendingMatchCall = nil
                        let nsError = error as NSError
                        if nsError.domain == GKErrorDomain && nsError.code == GKError.Code.cancelled.rawValue {
                            self.notifyListeners("matchStateChange", data: [
                                "phase": "idle",
                                "message": "已取消配對。"
                            ])
                            pendingCall.reject("已取消配對。", "cancelled", nsError)
                            return
                        }
                        self.notifyListeners("matchStateChange", data: [
                            "phase": "error",
                            "message": "配對失敗。",
                            "errorMessage": nsError.localizedDescription
                        ])
                        pendingCall.reject("配對失敗。", "matchmaking_error", nsError)
                        return
                    }

                    guard let match else {
                        self.pendingMatchCall = nil
                        self.notifyListeners("matchStateChange", data: [
                            "phase": "error",
                            "message": "配對失敗。",
                            "errorMessage": "Game Center 沒有回傳對戰資料。"
                        ])
                        pendingCall.reject("配對失敗。", "empty_match")
                        return
                    }

                    self.currentMatch = match
                    match.delegate = self
                    GKMatchmaker.shared().finishMatchmaking(for: match)
                    self.pendingMatchCall = nil

                    let opponent = self.resolveOpponentPayload(from: match.players.first)
                    self.notifyListeners("matchStateChange", data: [
                        "phase": "matched",
                        "message": "配對成功，準備進入對戰。",
                        "opponentProfile": opponent
                    ])
                    pendingCall.resolve([
                        "matchId": match.description,
                        "opponentProfile": opponent
                    ])
                }
            }
        }
    }

    @objc func cancelMatchmaking(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            GKMatchmaker.shared().cancel()

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

    func match(_ match: GKMatch, player: GKPlayer, didChange state: GKPlayerConnectionState) {
        if state == .connected {
            notifyListeners("matchPlayerStateChange", data: [
                "playerId": player.gamePlayerID,
                "state": "connected"
            ])
            return
        }
        if state == .disconnected {
            notifyListeners("matchPlayerStateChange", data: [
                "playerId": player.gamePlayerID,
                "state": "disconnected"
            ])
        }
    }

    func match(_ match: GKMatch, didFailWithError error: Error?) {
        let message = (error as NSError?)?.localizedDescription ?? "未知錯誤"
        notifyListeners("matchStateChange", data: [
            "phase": "error",
            "message": "對戰連線中斷。",
            "errorMessage": message
        ])
    }
}
