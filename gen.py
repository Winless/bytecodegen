from evmdasm import EvmInstructions, EvmProgram, registry, Instruction, utils
p = EvmProgram()
#default
p.push("80")
p.push("40")
p.op("MSTORE")

#check callvalue
p.op("CALLVALUE")
p.op("DUP1")
p.op("ISZERO")
p.op("JUMPI", flag=1)
p.push("00")
p.op("DUP1")
p.op("REVERT")

p.op("JUMPDEST", flag=1)
p.op("POP")

#calldatacopy(0, 0, calldatasize())
p.op("CALLDATASIZE")
p.push("00")
p.op("DUP1")
p.op("CALLDATACOPY")

#let result := delegatecall(gas(), ERC20, 0, calldatasize(), 0, 0)
p.push("00")
p.op("DUP1")
p.op("CALLDATASIZE")
p.push("00")
#ERC20 地址 待定
p.push("0x892a2b7cF919760e148A0d33C1eb0f44D3b383f8")
p.op("GAS")
p.op("DELEGATECALL")

#returndatacopy(0, 0, returndatasize())
p.op("RETURNDATASIZE")
p.push("00")
p.op("DUP1")
p.op("RETURNDATACOPY")
p.op("DUP1")
p.op("DUP1")
p.op("ISZERO")
p.op("JUMPI", flag=2)

p.op("RETURNDATASIZE")
p.push("00")
p.op("RETURN")

p.op("JUMPDEST", flag=2)
p.op("RETURNDATASIZE")
p.push("00")
p.op("REVERT")
#check return value

jumps = [j for j in p._program if j.name in ("JUMP","JUMPI")]
for jump in jumps:
        jmpdest = [j for j in p._program if j.name == "JUMPDEST" and j.flag == jump.flag][0]
        print(jmpdest.address)
        item = p.create_push_for_data(jmpdest.address)
        p._program.insert(p._program.index(jump), item)  # insert fixes addresses
        p._program._update_instruction_addresses()
        jmpdest = [j for j in p._program if j.name == "JUMPDEST" and j.flag == jump.flag][0]

        item.operand_bytes = utils.int2bytes(jmpdest.address)
print(jumps)
# p.push()

print(p._program)

print(p.assemble().as_hexstring)