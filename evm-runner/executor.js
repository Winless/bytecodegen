import { join } from "path";
import { readFileSync } from "fs";
import { defaultAbiCoder as AbiCoder, Interface } from "@ethersproject/abi";
import { Address, bytesToHex, hexToBytes } from "@ethereumjs/util";
import { Chain, Common, Hardfork } from "@ethereumjs/common";
import { LegacyTransaction } from "@ethereumjs/tx";
import { VM } from "@ethereumjs/vm";
import { buildTransaction, encodeDeployment, encodeFunction } from "./helpers/tx-builder.js";
import { getAccountNonce, insertAccount } from "./helpers/account-utils.js";
import { Block } from "@ethereumjs/block";
import solc from "solc";

const INITIAL_GREETING = "Hello, World!";
const SECOND_GREETING = "Hola, Mundo!";

const common = new Common({ chain: Chain.Mainnet, hardfork: Hardfork.Istanbul });
const block = Block.fromBlockData({ header: { extraData: new Uint8Array(97) } }, { common });

/**
 * This function creates the input for the Solidity compiler.
 *
 * For more info about it, go to https://solidity.readthedocs.io/en/v0.5.10/using-the-compiler.html#compiler-input-and-output-json-description
 *
 * Note: this example additionally needs the Solidity compiler `solc` package (out of EthereumJS
 * scope) being installed. You can do this (in this case it might make sense to install globally)
 * with `npm i -g solc`.
 */
function getSolcInput() {
    return {
        language: "Solidity",
        sources: {
            "helpers/ERC20.sol": {
                content: readFileSync(join("helpers", "ERC20.sol"), "utf8"),
            },
        },
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            evmVersion: "petersburg",
            outputSelection: {
                "*": {
                    "*": ["abi", "evm.bytecode"],
                },
            },
        },
    };
}

/**
 * This function compiles all the contracts in `contracts/` and returns the Solidity Standard JSON
 * output. If the compilation fails, it returns `undefined`.
 *
 * To learn about the output format, go to https://solidity.readthedocs.io/en/v0.5.10/using-the-compiler.html#compiler-input-and-output-json-description
 */
function compileContracts() {
    const input = getSolcInput();
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    let compilationFailed = false;

    if (output.errors) {
        for (const error of output.errors) {
            if (error.severity === "error") {
                console.error(error.formattedMessage);
                compilationFailed = true;
            } else {
                console.warn(error.formattedMessage);
            }
        }
    }

    if (compilationFailed) {
        return undefined;
    }

    return output;
}

function getGreeterDeploymentBytecode(solcOutput) {
    return solcOutput.contracts["helpers/Greeter.sol"].Greeter.evm.bytecode.object;
}

async function deployContract(vm, senderPrivateKey, deploymentBytecode, name, symbol) {
    // Contracts are deployed by sending their deployment bytecode to the address 0
    // The contract params should be abi-encoded and appended to the deployment bytecode.

    const data = encodeDeployment(deploymentBytecode, {
        types: ["string", "string"],
        values: [name, symbol],
    });
    const txData = {
        data,
        nonce: await getAccountNonce(vm, senderPrivateKey),
    };

    const tx = LegacyTransaction.fromTxData(buildTransaction(txData), { common }).sign(senderPrivateKey);

    const deploymentResult = await vm.runTx({ tx, block });

    if (deploymentResult.execResult.exceptionError) {
        throw deploymentResult.execResult.exceptionError;
    }

    return deploymentResult.createdAddress;
}

async function mint(vm, senderPrivateKey, contractAddress, address, amount) {
    const data = encodeFunction("mint", {
        types: ["address", "uint256"],
        values: [address, amount],
    });

    const txData = {
        to: contractAddress,
        data,
        nonce: await getAccountNonce(vm, senderPrivateKey),
    };

    const tx = LegacyTransaction.fromTxData(buildTransaction(txData), { common }).sign(senderPrivateKey);

    const setGreetingResult = await vm.runTx({ tx, block });

    if (setGreetingResult.execResult.exceptionError) {
        throw setGreetingResult.execResult.exceptionError;
    }
}

async function transfer(vm, senderPrivateKey, contractAddress, address, amount) {
    const data = encodeFunction("transfer", {
        types: ["address", "uint256"],
        values: [address, amount],
    });

    const txData = {
        to: contractAddress,
        data,
        nonce: await getAccountNonce(vm, senderPrivateKey),
    };

    const tx = LegacyTransaction.fromTxData(buildTransaction(txData), { common }).sign(senderPrivateKey);

    const setGreetingResult = await vm.runTx({ tx, block });

    if (setGreetingResult.execResult.exceptionError) {
        throw setGreetingResult.execResult.exceptionError;
    }
}

async function getBalance(vm, contractAddress, address, amount) {

}

async function main() {
    const accountPk = hexToBytes("0x"+process.env.PRIVATE_KEY);

    const vm = await VM.create({ common });
    const accountAddress = Address.fromPrivateKey(accountPk);
    console.log("Account: ", accountAddress.toString());
    await insertAccount(vm, accountAddress);
    console.log("Compiling...");

    const solcOutput = compileContracts();
    if (solcOutput === undefined) {
        throw new Error("Compilation failed");
    } else {
        console.log("Compiled the contract");
    }
    const ERC20Bytecode = solcOutput.contracts["helpers/ERC20.sol"].ERC20Mock.evm.bytecode.object;
    const ERC20Address = await deployContract(vm, accountPk, ERC20Bytecode, "USDC", "USDC");

    console.log("ERC20 address:", ERC20Address.toString());
    // const bytecode = getGreeterDeploymentBytecode(solcOutput);
    let templateBytecode = readFileSync("ERC20Custom.txt", "utf8");
    templateBytecode = templateBytecode.replace("892a2b7cf919760e148a0d33c1eb0f44d3b383f8", ERC20Address.toString().replace("0x", ""))
    const templateAddress = await deployContract(vm, accountPk, templateBytecode, "USDC", "USDC");
    console.log("Deploying the contract...");
    await mint(vm, accountPk, ERC20Address, "0x892a2b7cF919760e148A0d33C1eb0f44D3b383f8", 100);
    await mint(vm, accountPk, ERC20Address, "0x892a2b7cF919760e148A0d33C1eb0f44D3b383f8", 100);
    await mint(vm, accountPk, ERC20Address, "0x892a2b7cF919760e148A0d33C1eb0f44D3b383f8", 100);
    await transfer(vm, accountPk, ERC20Address, "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 50);
    console.log("Template address:", templateAddress.toString());
    await mint(vm, accountPk, templateAddress, "0x892a2b7cF919760e148A0d33C1eb0f44D3b383f8", 100);
    await mint(vm, accountPk, templateAddress, "0x892a2b7cF919760e148A0d33C1eb0f44D3b383f8", 100);
    await mint(vm, accountPk, templateAddress, "0x892a2b7cF919760e148A0d33C1eb0f44D3b383f8", 100);
    await transfer(vm, accountPk, templateAddress, "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 50);
    // const greeting = await getGreeting(vm, contractAddress, accountAddress);
    //
    // console.log("Greeting:", greeting);
    //
    // if (greeting !== INITIAL_GREETING)
    //     throw new Error(`initial greeting not equal, received ${greeting}, expected ${INITIAL_GREETING}`);
    //
    // console.log("Changing greeting...");
    //
    // await setGreeting(vm, accountPk, contractAddress, SECOND_GREETING);
    //
    // const greeting2 = await getGreeting(vm, contractAddress, accountAddress);
    //
    // console.log("Greeting:", greeting2);
    //
    // if (greeting2 !== SECOND_GREETING)
    //     throw new Error(`second greeting not equal, received ${greeting2}, expected ${SECOND_GREETING}`);

    // Now let's look at what we created. The transaction
    // should have created a new account for the contract
    // in the state. Let's test to see if it did.

    const createdAccount = await vm.stateManager.getAccount(templateAddress);
    let storage = await vm.stateManager.dumpStorage(templateAddress)
    let storage2 = await vm.stateManager.dumpStorage(ERC20Address)
    console.log("-------results-------");
    console.log("nonce: " + createdAccount.nonce.toString());
    console.log("balance in wei: ", createdAccount.balance.toString());
    console.log("storageRoot: " + bytesToHex(createdAccount.storageRoot));
    console.log("codeHash: " + bytesToHex(createdAccount.codeHash));
    console.log("---------------------");

    console.log("Everything ran correctly!");
    
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
