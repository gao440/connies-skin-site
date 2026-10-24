import AppKit
import Foundation
import LinkPresentation

// Read-only smoke check using Apple's native rich-link metadata provider.
// Does not open Messages, address a recipient, or send any content.
let application = NSApplication.shared
let provider = LPMetadataProvider()
provider.timeout = 25
provider.shouldFetchSubresources = true
let url = URL(string: CommandLine.arguments.dropFirst().first ?? "https://connieskin.com/")!
var finished = false
provider.startFetchingMetadata(for: url) { metadata, error in
    var result: [String: Any] = ["requestedURL": url.absoluteString]
    if let error = error { result["error"] = error.localizedDescription }
    if let metadata = metadata {
        result["title"] = metadata.title ?? ""
        result["url"] = metadata.url?.absoluteString ?? ""
        result["hasImage"] = metadata.imageProvider != nil
        result["hasVideo"] = metadata.videoProvider != nil
        result["videoTypes"] = metadata.videoProvider?.registeredTypeIdentifiers ?? []
        result["remoteVideoURL"] = metadata.remoteVideoURL?.absoluteString ?? ""
    }
    if let data = try? JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys]),
       let text = String(data: data, encoding: .utf8) { print(text) }
    finished = true
}
let deadline = Date().addingTimeInterval(30)
while !finished && Date() < deadline { RunLoop.main.run(until: Date().addingTimeInterval(0.1)) }
if !finished { print("{\"error\":\"Native link-preview check timed out\"}"); exit(1) }
