// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Payment/coordination layer for the BagBurner agent economy.
/// Guest agents pay here to request a tax report on a wallet; the host agent
/// verifies the resulting event on-chain before performing the (off-chain) analysis.
contract ReportPayments {
    address public immutable host;
    uint256 public reportFee;
    uint256 public requestCount;

    event ReportRequested(
        address indexed guest,
        address indexed walletAnalyzed,
        uint256 fee,
        uint256 timestamp,
        uint256 requestId
    );

    error InsufficientFee(uint256 required, uint256 sent);
    error NotHost();
    error WithdrawFailed();

    constructor(uint256 _reportFee) {
        host = msg.sender;
        reportFee = _reportFee;
    }

    function payForReport(address walletAnalyzed) external payable returns (uint256 requestId) {
        if (msg.value < reportFee) revert InsufficientFee(reportFee, msg.value);
        requestId = ++requestCount;
        emit ReportRequested(msg.sender, walletAnalyzed, msg.value, block.timestamp, requestId);
    }

    function setReportFee(uint256 _fee) external {
        if (msg.sender != host) revert NotHost();
        reportFee = _fee;
    }

    function withdraw() external {
        if (msg.sender != host) revert NotHost();
        (bool ok, ) = payable(host).call{value: address(this).balance}("");
        if (!ok) revert WithdrawFailed();
    }
}
