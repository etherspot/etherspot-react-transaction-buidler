import { Account, AccountStates, GatewayTransactionStates, NotificationTypes, Sdk } from 'etherspot';
import { map } from 'rxjs/operators';
import { buildUrlOptions } from './common';
import { deployAccount } from './transaction';

export const buildMtPelerinOptions = (code: string, address: string) => {
  let onRampOptions = {
    lang: 'fr',
    tab: 'buy',
    tabs: 'buy',
    chain: 'matic_mainnet',
    net: 'matic_mainnet',
    nets: 'arbitrum_mainnet,avalanche_mainnet,bsc_mainnet,fantom_mainnet,mainnet,optimism_mainnet,xdai_mainnet',
    crys: 'AVAX,BNB,BTCB,BUSD,DAI,ETH,FRAX,LUSD,MAI,MATIC,RBTC,RDOC,RIF,USDC,USDT,WBTC,WETH,XCHF,XDAI,XTZ',
    rfr: 'etherspot',
    bsc: 'GBP',
    bdc: 'MATIC',
    mode: 'dark',
    hash: '',
    code: code,
    addr: address || '',
  };

  return onRampOptions;
};

export const openMtPelerinTab = async (
  sdk: Sdk,
  account: Account,
  deployingAccount = false,
  setDeployingAccount?: (value: boolean) => void,
  showAlert?: (message: string) => void
) => {
  let base64Hash = '';
  const code = Math.floor(Math.random() * 8999) + 1000;
  const message = 'MtPelerin-' + code;
  let onRampOptions = buildMtPelerinOptions(code.toString(), account.address);

  if (account.state === AccountStates.UnDeployed) {
    if (deployingAccount) {
      !!showAlert && showAlert('Deploying Etherspot wallet, please try again later.');
      return;
    }

    !!setDeployingAccount && setDeployingAccount(true);
    const submittedGateway = await deployAccount(sdk);
    !!setDeployingAccount && setDeployingAccount(true);

    if (!submittedGateway) {
      !!showAlert && showAlert('Failed to deploy the Etherspot wallet');
      return;
    }

    sdk.notifications$
      .pipe(
        map(async (notification) => {
          if (notification?.type === NotificationTypes.GatewayBatchUpdated) {
            const submittedBatch = await sdk.getGatewaySubmittedBatch({
              hash: submittedGateway.hash,
            });

            const failedStates = [
              GatewayTransactionStates.Canceling,
              GatewayTransactionStates.Canceled,
              GatewayTransactionStates.Reverted,
            ];

            if (submittedBatch?.transaction?.state && failedStates.includes(submittedBatch?.transaction?.state)) {
              !!showAlert && showAlert('Failed to deploy the Etherspot wallet');
            } else if (submittedBatch?.transaction?.state === GatewayTransactionStates.Sent) {
              const signature = await sdk.signMessage({ message });
              base64Hash = Buffer.from(signature.replace('0x', ''), 'hex').toString('base64');

              if (!base64Hash) {
                !!showAlert && showAlert('There was an error getting the signature, please try again.');
                return;
              }

              onRampOptions.hash = base64Hash;
              const options = buildUrlOptions(onRampOptions);
              window.open(`https://buy.mtpelerin.com/${options}`, '_blank', 'noopener,noreferrer');
            }
          }
        })
      )
      .subscribe();
  } else {
    const signature = await sdk.signMessage({ message });
    base64Hash = Buffer.from(signature.replace('0x', ''), 'hex').toString('base64');
    if (!base64Hash) {
      !!showAlert && showAlert('There was an error getting the signature, please try again.');
      return;
    }

    onRampOptions.hash = base64Hash;
    const options = buildUrlOptions(onRampOptions);
    window.open(`https://buy.mtpelerin.com/${options}`, '_blank', 'noopener,noreferrer');
  }
};
