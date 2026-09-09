// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CitableRegistry} from "../src/CitableRegistry.sol";
import {INameGuard} from "../src/INameGuard.sol";

/// @dev Guard mit fest eingetragener Berechtigung. Prüft die Verdrahtung in der
///      Registry, nicht ENS — das leistet der Fork-Test.
contract AllowListGuard is INameGuard {
    mapping(bytes32 ensNode => mapping(address account => bool)) public allowed;

    function allow(bytes32 ensNode, address account) external {
        allowed[ensNode][account] = true;
    }

    function mayPublish(bytes32 ensNode, address account) external view returns (bool) {
        return allowed[ensNode][account];
    }
}

contract NameGuardTest is Test {
    CitableRegistry registry;
    AllowListGuard guard;

    address deployer = makeAddr("deployer");
    address author = makeAddr("author");
    address stranger = makeAddr("stranger");

    bytes32 ensNode = keccak256("wochenzeitung");
    bytes32 root = keccak256("root");
    string constant CID = "bafkreigh2akiscaildc";

    function setUp() public {
        vm.prank(deployer);
        registry = new CitableRegistry();
        guard = new AllowListGuard();
        guard.allow(ensNode, author);
    }

    function _setGuard() internal {
        vm.prank(deployer);
        registry.setNameGuard(guard);
    }

    // ---------------------------------------------------------------
    // Bestandsverhalten
    // ---------------------------------------------------------------

    function test_NoGuardByDefault() public view {
        assertEq(address(registry.nameGuard()), address(0));
        assertEq(registry.owner(), deployer);
    }

    /// @notice Ohne Guard darf jeder jeden Namen behaupten — das Verhalten vor der
    ///         ENS-Schicht, und der Zustand direkt nach dem Deploy.
    function test_WithoutGuard_AnyoneMayClaimAnyName() public {
        vm.prank(stranger);
        registry.registerRoot(root, ensNode, CID, 4);
        assertEq(registry.getStatement(root).author, stranger);
    }

    // ---------------------------------------------------------------
    // Mit Guard
    // ---------------------------------------------------------------

    function test_SetNameGuard() public {
        vm.expectEmit(true, true, true, true);
        emit CitableRegistry.NameGuardChanged(address(guard));
        _setGuard();
        assertEq(address(registry.nameGuard()), address(guard));
    }

    function test_RevertWhen_NotOwnerSetsGuard() public {
        vm.prank(stranger);
        vm.expectRevert(CitableRegistry.NotOwner.selector);
        registry.setNameGuard(guard);
    }

    function test_WithGuard_AuthorisedAccountMayPublish() public {
        _setGuard();
        vm.prank(author);
        registry.registerRoot(root, ensNode, CID, 4);
        assertEq(registry.getStatement(root).ensNode, ensNode);
    }

    /// @notice Der Punkt der ganzen Schicht: ein Fremder kann den Namen nicht behaupten.
    function test_RevertWhen_UnauthorisedAccountPublishes() public {
        _setGuard();
        vm.prank(stranger);
        vm.expectRevert(CitableRegistry.NotAuthorized.selector);
        registry.registerRoot(root, ensNode, CID, 4);
    }

    /// @notice Berechtigung gilt pro Name, nicht pro Konto.
    function test_RevertWhen_AuthorisedForAnotherName() public {
        _setGuard();
        vm.prank(author);
        vm.expectRevert(CitableRegistry.NotAuthorized.selector);
        registry.registerRoot(root, keccak256("fremdes-blatt"), CID, 4);
    }

    /// @notice Der Guard lässt sich wieder abschalten — dokumentierte Zentralisierung.
    function test_GuardCanBeRemoved() public {
        _setGuard();
        vm.prank(deployer);
        registry.setNameGuard(INameGuard(address(0)));

        vm.prank(stranger);
        registry.registerRoot(root, ensNode, CID, 4);
        assertEq(registry.getStatement(root).author, stranger);
    }

    /// @notice Die Prüfung sitzt nach den billigen Prüfungen — ein leerer Eintrag
    ///         scheitert auch mit Berechtigung.
    function test_RevertWhen_EmptyStatementDespiteAuthorisation() public {
        _setGuard();
        vm.prank(author);
        vm.expectRevert(CitableRegistry.EmptyStatement.selector);
        registry.registerRoot(root, ensNode, CID, 0);
    }
}
