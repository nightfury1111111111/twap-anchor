const anchor = require('@project-serum/anchor');

// Configure the local cluster.
const provider = anchor.Provider.local("https://api.devnet.solana.com");
anchor.setProvider(provider);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // #region main
  // Read the generated IDL.
  const idl = JSON.parse(require('fs').readFileSync('./target/idl/moet_twap.json', 'utf8'));

  // Address of the deployed program.
  const programId = new anchor.web3.PublicKey('9gYhNwGyzzXyScJRAeBxX1ahUe38F2sh5N59idX2fZUn');

  // Generate the program client from IDL.
  const program = new anchor.Program(idl, programId);

  const priceInfo = anchor.web3.Keypair.generate();
  const solUsd = new anchor.web3.PublicKey('BdgHsXrH1mXqhdosXavYxZgX6bGqTdj5mh2sxDhF8bJy');

  // Execute the RPC.
  await program.rpc.create({
    accounts: {
      priceInfo: priceInfo.publicKey,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
    signers: [priceInfo],
    instructions: [await program.account.priceInfo.createInstruction(priceInfo, 1000)],
  })

  for (let i = 0; i < 5000; i++) {
    await program.rpc.update({
      accounts: {
        priceInfo: priceInfo.publicKey,
        priceAccount: solUsd,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
    })
    const priceInfoAccount = await program.account.priceInfo.fetch(priceInfo.publicKey)
    console.log(i + ": twap = " + priceInfoAccount.twap.toNumber())
    await sleep(5000);
  }
  // #endregion main
}

console.log('Running client.');
main().then(() => console.log('Success'));
