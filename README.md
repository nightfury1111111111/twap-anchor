## Moet Anchor-TWAP Challenge

### About

This is a minimum viable implementation for Moet's TWAP challenge.

### Build & Deploy

- Use `devnet`:
```bash
solana config set -u https://api.devnet.solana.com
```

- Build program:
```bash
anchor build
```

- Deploy program to `devnet`:
```bash
anchor deploy
```

### Run Client

```bash
node client.js
```