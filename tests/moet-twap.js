const assert = require('assert');
const anchor = require('@project-serum/anchor');

describe('twap', () => {
  const provider = anchor.Provider.local()

  // Configure the client to use the local cluster.
  anchor.setProvider(provider)

  // priceInfo for the tests.
  const collateralTokenFeed = anchor.web3.Keypair.generate()
  const priceInfo = anchor.web3.Keypair.generate()

  const solUsd = new anchor.web3.PublicKey('BdgHsXrH1mXqhdosXavYxZgX6bGqTdj5mh2sxDhF8bJy');

  // Program for the tests.
  const oracleProgram = anchor.workspace.Pyth
  const program = anchor.workspace.MoetTwap

  it('tests twap', async () => {

    const conf = new anchor.BN((40000 / 10) * 10 ** 6)
    await oracleProgram.rpc.initialize(new anchor.BN(40000 * 10 ** 6), -6, conf, {
      accounts: { price: collateralTokenFeed.publicKey },
      signers: [collateralTokenFeed],
      instructions: [
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: oracleProgram.provider.wallet.publicKey,
          newAccountPubkey: collateralTokenFeed.publicKey,
          space: 3312,
          lamports: await oracleProgram.provider.connection.getMinimumBalanceForRentExemption(3312),
          programId: oracleProgram.programId,
        }),
      ],
    })

    await oracleProgram.rpc.setPrice(new anchor.BN(40010 * 10 ** 6), {
      accounts: { price: collateralTokenFeed.publicKey },
    })

    await program.rpc.create({
      accounts: {
        priceInfo: priceInfo.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [priceInfo],
      instructions: [await program.account.priceInfo.createInstruction(priceInfo, 1000)],
    })

    let priceInfoAccount = await program.account.priceInfo.fetch(priceInfo.publicKey)

    assert.ok(priceInfoAccount.twap.toNumber() === 0)

    await program.rpc.update({
      accounts: {
        priceInfo: priceInfo.publicKey,
        priceAccount: collateralTokenFeed.publicKey,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
    })

    priceInfoAccount = await program.account.priceInfo.fetch(priceInfo.publicKey)

    assert.strictEqual(priceInfoAccount.twap.toNumber(), new anchor.BN(40010 * 10 ** 6).toNumber())

    await oracleProgram.rpc.setPrice(new anchor.BN(40020 * 10 ** 6), {
      accounts: { price: collateralTokenFeed.publicKey },
    })

    for (i = 0; i < 100; i++) {
      await program.rpc.update({
        accounts: {
          priceInfo: priceInfo.publicKey,
          priceAccount: collateralTokenFeed.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
      })
      priceInfoAccount = await program.account.priceInfo.fetch(priceInfo.publicKey)
      if (priceInfoAccount.twap.toNumber() === new anchor.BN(40015 * 10 ** 6).toNumber()) {
        break;
      }
    }

    assert.strictEqual(priceInfoAccount.twap.toNumber(), new anchor.BN(40015 * 10 ** 6).toNumber())
  })
})
