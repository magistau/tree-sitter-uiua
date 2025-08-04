import XCTest
import SwiftTreeSitter
import TreeSitterUiua

final class TreeSitterUiuaTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_uiua())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Uiua grammar")
    }
}
