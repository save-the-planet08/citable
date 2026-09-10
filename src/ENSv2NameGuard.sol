// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {INameGuard} from "./INameGuard.sol";

/// @notice The slice of the ENSv2 `PermissionedRegistry` the guard needs.
/// @dev Both functions take an arbitrary identifier (labelhash, token id or resource) and
///      resolve the version bits themselves. That is exactly why the guard never computes a
///      token id: the lower 32 bits carry `tokenVersionId` resp. `eacVersionId` from
///      registry storage and change without warning — proof in script/js/ens-probe.mjs.
interface IENSv2Registry {
    /// @return The token holder, or `address(0)` if free, reserved or expired.
    function getOwner(uint256 anyId) external view returns (address);

    /// @return The roles of `account` for exactly this name.
    function roles(uint256 anyId, address account) external view returns (uint256);
}

/// @title ENSv2NameGuard
/// @notice Checks against ENSv2 whether an account may publish under a name.
/// @dev Not merely ownership: whoever was granted the publisher role may publish too. That
///      models a newsroom — an intern publishes under the newspaper's name without owning
///      it.
///
///      `ensNode` is the ENSv2 identifier of the name in `REGISTRY`, that is
///      `labelhash(label)` — not the ENSv1 namehash. A namehash could not be turned back
///      into the label, and without the label the registry cannot find its entry. So v1
///      covers the names of exactly one registry; subnames would need a descent via
///      `getSubregistry` and are deferred.
contract ENSv2NameGuard is INameGuard {
    /// @notice The registry whose names this guard knows (on Sepolia: the ETHRegistry).
    IENSv2Registry public immutable REGISTRY;

    /// @notice The role that authorises publishing.
    /// @dev No new role bit can be invented: ENSv2 grants admin roles only at registration,
    ///      so a holder can only pass on what they hold the admin bit for. On Sepolia that
    ///      is `ROLE_SET_RESOLVER` (1 << 24) — whoever may change a name's resolver is
    ///      answerable for what stands under that name. A constructor value rather than a
    ///      constant, so another registry with a different role scheme can use the same
    ///      guard.
    uint256 public immutable PUBLISH_ROLE;

    error RegistryWithoutCode();
    error ZeroRole();

    /// @dev The registry address is immutable. If it points nowhere, every `mayPublish`
    ///      reverts and with it every `registerRoot` — and the only cure would be a new
    ///      guard. A typo must not get through here.
    constructor(IENSv2Registry registry, uint256 publishRole) {
        if (address(registry).code.length == 0) revert RegistryWithoutCode();
        if (publishRole == 0) revert ZeroRole();
        REGISTRY = registry;
        PUBLISH_ROLE = publishRole;
    }

    /// @inheritdoc INameGuard
    function mayPublish(bytes32 ensNode, address account) external view returns (bool) {
        if (account == address(0)) return false;

        uint256 anyId = uint256(ensNode);
        address holder = REGISTRY.getOwner(anyId);

        // No holder means: free, reserved or expired. "ens" on Sepolia is exactly this
        // case — resolver and expiry set, but a token was never minted.
        if (holder == address(0)) return false;
        if (holder == account) return true;

        // `roles` and not `hasRoles`: `hasRoles` folds in the roles of the ROOT_RESOURCE.
        // Whoever holds them there — the registry's registrar — could otherwise publish
        // under any name that is not theirs. That back door stays shut.
        return REGISTRY.roles(anyId, account) & PUBLISH_ROLE == PUBLISH_ROLE;
    }
}
