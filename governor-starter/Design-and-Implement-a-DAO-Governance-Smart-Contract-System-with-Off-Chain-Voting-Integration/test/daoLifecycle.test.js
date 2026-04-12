const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO Governance Lifecycle", function () {
  let deployer, voter;
  let token, timelock, governor, treasury;

  beforeEach(async function () {
    [deployer, voter] = await ethers.getSigners();

    // Deploy GOVToken with initial supply
    const GOVToken = await ethers.getContractFactory("GOVToken");
    token = await GOVToken.deploy(ethers.parseEther("1000000"));
    await token.waitForDeployment();

    // Delegate votes
    await token.delegate(deployer.address);

    // Deploy Timelock (constructor: minDelay, proposers[], executors[])
    const Timelock = await ethers.getContractFactory("DAOTimelock");
    timelock = await Timelock.deploy(3600, [], []);
    await timelock.waitForDeployment();

    // Deploy Governor (constructor: token, timelock)
    const Governor = await ethers.getContractFactory("DAOGovernor");
    governor = await Governor.deploy(await token.getAddress(), await timelock.getAddress());
    await governor.waitForDeployment();

    // Setup Timelock roles
    await timelock.grantRole(await timelock.PROPOSER_ROLE(), await governor.getAddress());
    await timelock.grantRole(await timelock.EXECUTOR_ROLE(), ethers.ZeroAddress);
    await timelock.revokeRole(await timelock.TIMELOCK_ADMIN_ROLE(), deployer.address);

    // Deploy Treasury (constructor: owner)
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(await timelock.getAddress());
    await treasury.waitForDeployment();

    // Fund Treasury
    await deployer.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("5")
    });
  });

  it("Should have voting power after delegation", async function () {
    const votes = await token.getVotes(deployer.address);
    expect(votes).to.be.gt(0);
  });

  it("Should create a proposal and allow voting", async function () {
    const encodedCall = treasury.interface.encodeFunctionData("withdrawETH", [deployer.address, 0]);

    const tx = await governor.propose(
      [await treasury.getAddress()],
      [0],
      [encodedCall],
      "Test proposal"
    );
    const receipt = await tx.wait();
    const proposalId = receipt.logs[0].args.proposalId;

    // Advance one block for voting delay
    await ethers.provider.send("evm_mine");

    await governor.castVote(proposalId, 1); // FOR
    const votes = await governor.proposalVotes(proposalId);
    expect(votes.forVotes).to.be.gt(0);
  });

  it("Should run full lifecycle and execute withdrawal", async function () {
    const amount = ethers.parseEther("1");
    const description = "Lifecycle Proposal: Withdraw 1 ETH to voter";

    const encodedCall = treasury.interface.encodeFunctionData("withdrawETH", [voter.address, amount]);

    const tx = await governor.propose(
      [await treasury.getAddress()],
      [0],
      [encodedCall],
      description
    );
    const receipt = await tx.wait();
    const proposalId = receipt.logs[0].args.proposalId;

    // Advance blocks for voting delay
    const votingDelay = await governor.votingDelay();
    for (let i = 0; i < votingDelay; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Vote
    await governor.castVote(proposalId, 1);

    // Advance blocks for voting period
    const votingPeriod = await governor.votingPeriod();
    for (let i = 0; i < votingPeriod; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Queue
    const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
    await governor.queue([await treasury.getAddress()], [0], [encodedCall], descriptionHash);

    // Advance time for timelock delay
    const minDelay = await timelock.getMinDelay();
    await ethers.provider.send("evm_increaseTime", [Number(minDelay)]);
    await ethers.provider.send("evm_mine", []);

    // Execute
    await governor.execute([await treasury.getAddress()], [0], [encodedCall], descriptionHash);

    // Check balances
    const treasuryBalance = await ethers.provider.getBalance(await treasury.getAddress());
    const voterBalance = await ethers.provider.getBalance(voter.address);

    expect(ethers.formatEther(treasuryBalance)).to.equal("4.0");
    expect(Number(ethers.formatEther(voterBalance))).to.be.greaterThan(10000);
  });
});

//cd governor-starter   "in terminal 1 & 2"
//cd Design-and-Implement-a-DAO-Governance-Smart-Contract-System-with-Off-Chain-Voting-Integration "in terminal 1 & 2" 
//npx hardhat node "in terminal 1"
//npx hardhat compile "in terminal 2"
//npx hardhat test  "in terminal 2"