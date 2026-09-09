// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title INameGuard
/// @notice Entscheidet, ob `account` unter `ensNode` veröffentlichen darf.
/// @dev Die Schnittstelle sagt bewusst nichts darüber, wie `ensNode` zu lesen ist —
///      das legt die jeweilige Implementierung fest und dokumentiert es. Für
///      `ENSv2NameGuard` ist es die ENSv2-Kennung eines Namens in der konfigurierten
///      Registry (`labelhash(label)`), nicht der klassische ENSv1-Namehash.
interface INameGuard {
    /// @param ensNode Der Name, unter dem veröffentlicht werden soll.
    /// @param account Das Konto, das `registerRoot` aufruft.
    /// @return true, wenn `account` unter `ensNode` veröffentlichen darf.
    function mayPublish(bytes32 ensNode, address account) external view returns (bool);
}
