// 直接从storage中读取
import {readFileSync} from "fs";
import { ethers } from "ethers"
const provider = ethers.getDefaultProvider("https://eth-sepolia-public.unifra.io")
let wallet = new ethers.Wallet("0x" + process.env.PRIVATE_KEY, provider);

let ERC20Address = "0x38DC712f2885D4261d2a7571C5b555c60612766a";
let abi = JSON.parse(readFileSync("./helpers/ERC20-abi.json", "utf8"));

async function deploy() {
    let templateBytecode = readFileSync("ERC20Custom.txt", "utf8");
    templateBytecode = templateBytecode.replace("892a2b7cf919760e148a0d33c1eb0f44d3b383f8", ERC20Address.toString().replace("0x", ""))
    const ContractInstance = new ethers
        .ContractFactory(abi, templateBytecode, wallet);
    const contractInstance =
        await ContractInstance.deploy("USDC", "USDC");
}

async function test() {
    let addr = "0xFf16D17959B89210dcf672e0D2aBA7450B43c69D"
    const contract = new ethers.Contract(addr, abi, wallet);
    await contract.mint("0x892a2b7cF919760e148A0d33C1eb0f44D3b383f8", 100)

    let res = await provider.getStorage(addr, 2);
    console.log(res)
}

async function main() {
    await test()
}

main()
// const slot = 0;
// const paddedAddress = web3.utils.leftPad(addr, 64);
// const paddedSlot = web3.utils.padLeft(slot, 64);
// let index = web3.utils.soliditySha3(paddedAddress, paddedSlot);
// //  mapping(address account => uint256) private _balances;
// let res = await web3.eth.getStorageAt("0x228C9731e289937FBD1B5bE7897522f2ecEb7630", index);
// console.log(res);
//
// let paddedAcc = web3.utils.padLeft(addr, 64);
// let paddedSender = web3.utils.padLeft("0x228C9731e289937FBD1B5bE7897522f2ecEb7630", 64);
// let indexAllowance = web3.utils.soliditySha3(paddedSender, web3.utils.soliditySha3(paddedAcc, 1));
//
// //  mapping(address account => mapping(address spender => uint256)) private _allowances;
// res = await web3.eth.getStorageAt("0x228C9731e289937FBD1B5bE7897522f2ecEb7630", indexAllowance);
// console.log(res);
//
// //  uint256 private _totalSupply;
// res = await web3.eth.getStorageAt("0x228C9731e289937FBD1B5bE7897522f2ecEb7630", 2);
// console.log(res);
//
// //  string private _name;
// res = await web3.eth.getStorageAt("0x228C9731e289937FBD1B5bE7897522f2ecEb7630", 3);
// console.log(res);
//
// //  string private _symbol;
// res = await web3.eth.getStorageAt("0x228C9731e289937FBD1B5bE7897522f2ecEb7630", 4);
// console.log(res);
