// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title INameGuard
/// @notice Decides whether `account` may publish under `ensNode`.
/// @dev The interface deliberately says nothing about how to read `ensNode` — each
///      implementation defines and documents that itself. For `ENSv2NameGuard` it is the
///      ENSv2 identifier of a name in the configured registry (`labelhash(label)`), not
///      the classic ENSv1 namehash.
interface INameGuard {
    /// @param ensNode The name to publish under.
    /// @param account The account calling `registerRoot`.
    /// @return true if `account` may publish under `ensNode`.
    function mayPublish(bytes32 ensNode, address account) external view returns (bool);
}
