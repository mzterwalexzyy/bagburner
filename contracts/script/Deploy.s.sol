// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ReportPayments} from "../src/ReportPayments.sol";

contract DeployScript is Script {
    ReportPayments public reportPayments;

    // Default fee: 0.0005 native token per report request.
    uint256 constant DEFAULT_FEE = 0.0005 ether;

    function run() public {
        vm.startBroadcast();

        reportPayments = new ReportPayments(DEFAULT_FEE);
        console.log("ReportPayments deployed at:", address(reportPayments));
        console.log("Host (deployer):", reportPayments.host());
        console.log("Report fee (wei):", reportPayments.reportFee());

        vm.stopBroadcast();
    }
}
