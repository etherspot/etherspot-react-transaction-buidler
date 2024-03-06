<a href="https://etherspot.io"> <img src=".github/etherspot-logo.svg" alt="Etherspot Logo" style="width: 50%; height: auto; margin: auto;"></a>

[![License](https://img.shields.io/github/license/etherspot/etherspot-react-transaction-buidler)](https://github.com/etherspot/etherspot-react-transaction-buidler/LICENSE) [![npm](https://img.shields.io/npm/v/@etherspot/react-transaction-buidler)](https://www.npmjs.com/package/@etherspot/react-transaction-buidler) [![contributions](https://img.shields.io/github/contributors/etherspot/etherspot-react-transaction-buidler)](https://github.com/etherspot/etherspot-react-transaction-buidler/graphs/contributors) [![discord](https://img.shields.io/discord/996437599453450280)](https://discord.etherspot.io)

# Etherspot transaction BUIDLer for React

- Website: [https://etherspot.io](https://etherspot.io)
- Documentation: [https://docs.etherspot.dev](https://docs.etherspot.dev)
- SDK Docs: [https://sdk.etherspot.dev](https://sdk.etherspot.dev)
- SDK Playground [https://try.etherspot.dev](https://try.etherspot.dev)

BUIDLer is a react component that allows plug-and-play integration with the Etherspot SDK, allowing dApps and developers to easily leverage the SDK in a highly customisable fashion. 

<a href="https://buidler.etherspot.io">Try live demo</a></p>

## Prerequisites

Please ensure that you have the Editor Config plugin installed for VS Code:

```
Name: EditorConfig for VS Code
Id: EditorConfig.EditorConfig
Description: EditorConfig Support for Visual Studio Code
Version: 0.16.4
Publisher: EditorConfig
VS Marketplace Link: https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig
```

## Getting Started

Install Etherspot transaction BUIDLer using npm or yarn

```
npm i @etherspot/react-transaction-buidler
```
Plug in your dApp

```
import {
  Etherspot,
} from "@etherspot/react-transaction-buidler";

/**
 * This is all that is needed to get started.
 * To customise this, see the possible props
 * you can pass in the docs.
 */
function RenderEtherspot(props) {
  return <Etherspot />;
}
```

## Developing locally
You can set up BUIDLER locally and develop new features for it. Please follow the instructions below:

- First, check out the Etherspot BUIDLER Example dapp [here](https://github.com/etherspot/etherspot-react-transaction-buidler-demo-dapp)
- Then, checkout this repository
- In this repository directory: run `npm install && npm link`
- In this repository directory:: run `npm run rollup:watch` - this project is now being watched for code changes
- In the Example dapp directory: run `npm install && npm link @etherspot/react-transaction-buidler`
- In the Example dapp directory: add a file called ".env"
- To this file add this line: REACT_APP_WEB3AUTH_CLIENT_ID = "fake_id"
- Replace fake_id with a real client ID from https://dashboard.web3auth.io/home/web3auth if you want social logins to work. Otherwise continue without it and login with a keybased wallet
- In the Example dapp directory: run `npm run start`

You can now make code changes in this repository and changes will be reflected in the Example dapp.

## Contributions

Follow [guide](./CONTRIBUTING.md)

## Security

To report security issues please follow [guide](./SECURITY.md)
## License
[MIT](./LICENSE)
