const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);

  // 1. Deploy GOV Token
  const GOVToken = await ethers.getContractFactory("GOVToken");
  const token = await GOVToken.deploy(
    ethers.parseEther("1000000")
  );
  await token.waitForDeployment();
  console.log("GOVToken:", await token.getAddress());

  // 2. Deploy Timelock
  const Timelock = await ethers.getContractFactory("DAOTimelock");
  const timelock = await Timelock.deploy(
    3600, // 1 hour delay
    [],
    []
  );
  await timelock.waitForDeployment();
  console.log("Timelock:", await timelock.getAddress());

  // 3. Deploy Governor
  const Governor = await ethers.getContractFactory("DAOGovernor");
  const governor = await Governor.deploy(
    await token.getAddress(),
    await timelock.getAddress()
  );
  await governor.waitForDeployment();
  console.log("Governor:", await governor.getAddress());

  // 4. Configure Timelock roles
  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();

  await timelock.grantRole(proposerRole, await governor.getAddress());
  await timelock.grantRole(executorRole, ethers.ZeroAddress);
  await timelock.revokeRole(adminRole, deployer.address);

  console.log("Timelock roles configured");

  // 5. Deploy Treasury
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(await timelock.getAddress());
  await treasury.waitForDeployment();
  console.log("Treasury:", await treasury.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});



//cd governor-starter
//cd design-and-Implement-a-DAO-Governance-Smart-Contract-System-with-Off-Chain-Voting-Integration
//npx hardhat clean
//npx hardhat compile
//npx hardhat run scripts/deploy.js --network localhost

