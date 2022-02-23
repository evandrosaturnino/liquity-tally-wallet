import React, { useEffect, useReducer } from "react";
import { useWeb3React } from "@web3-react/core";
import { AbstractConnector } from "@web3-react/abstract-connector";
import { Button, Text, Flex, Link, Box } from "theme-ui";

import { injectedMetaMaskProvider, injectedTallyProvider } from "../connectors/connectors";
import { useAuthorizedConnection } from "../hooks/useAuthorizedConnection";

import { RetryDialog } from "./RetryDialog";
import { ConnectionConfirmationDialog } from "./ConnectionConfirmationDialog";
import { MetaMaskIcon } from "./MetaMaskIcon";
import { TallyIcon } from "./TalalyIcon";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

interface WhichWalletIsConnected {
  ethereum?: {
    isMetaMask?: boolean;
    isTally?: boolean;
  };
}

type ConnectionState =
  | { type: "inactive" }
  | {
      type: "activating" | "active" | "rejectedByUser" | "alreadyPending" | "failed";
      connector: AbstractConnector;
    };

type ConnectionAction =
  | { type: "startActivating"; connector: AbstractConnector }
  | { type: "fail"; error: Error }
  | { type: "finishActivating" | "retry" | "cancel" | "deactivate" };

const connectionReducer: React.Reducer<ConnectionState, ConnectionAction> = (state, action) => {
  switch (action.type) {
    case "startActivating":
      return {
        type: "activating",
        connector: action.connector
      };
    case "finishActivating":
      return {
        type: "active",
        connector: state.type === "inactive" ? injectedMetaMaskProvider : state.connector
      };
    case "fail":
      if (state.type !== "inactive") {
        return {
          type: action.error.message.match(/user rejected/i)
            ? "rejectedByUser"
            : action.error.message.match(/already pending/i)
            ? "alreadyPending"
            : "failed",
          connector: state.connector
        };
      }
      break;
    case "retry":
      if (state.type !== "inactive") {
        return {
          type: "activating",
          connector: state.connector
        };
      }
      break;
    case "cancel":
      return {
        type: "inactive"
      };
    case "deactivate":
      return {
        type: "inactive"
      };
  }
  
  console.warn("Ignoring connectionReducer action:");
  console.log(action);
  console.log("  in state:");
  console.log(state);

  return state;
};

const detectMetaMask = () => (window as WhichWalletIsConnected).ethereum?.isMetaMask ?? false;
const detectTally = () => (window as WhichWalletIsConnected).ethereum?.isTally ?? false;

type WalletConnectorProps = {
  loader?: React.ReactNode;
};

export const WalletConnector: React.FC<WalletConnectorProps> = ({ children, loader }) => {
  const { activate, deactivate, active, error } = useWeb3React<unknown>();
  const triedAuthorizedConnection = useAuthorizedConnection();
  const [connectionState, dispatch] = useReducer(connectionReducer, { type: "inactive" });
  const isMetaMask = detectMetaMask();
  const isTally = detectTally();

  useEffect(() => {
    if (error) {
      dispatch({ type: "fail", error });
      deactivate();
    }
  }, [error, deactivate]);

  useEffect(() => {
    if (active) {
      dispatch({ type: "finishActivating" });
    } else {
      dispatch({ type: "deactivate" });
    }
  }, [active]);

  if (!triedAuthorizedConnection) {
    return <>{loader}</>;
  }

  if (connectionState.type === "active") {
    return <>{children}</>;
  }

  return (
    <>
      <Flex sx={{ flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        {isTally || isMetaMask ? (
        <>
          <Button sx={{ mb: 3, width: "17em" }}
            onClick={() => {
              dispatch({ type: "startActivating", connector: injectedMetaMaskProvider });
              activate(injectedMetaMaskProvider);
            } }
          >
            <>
              <MetaMaskIcon />
              <Box sx={{ ml: 2 }}>Connect to MetaMask</Box>
            </>
          </Button>
          <Button sx={{ width: "17em" }}
            onClick={() => {
              dispatch({ type: "startActivating", connector: injectedTallyProvider });
              activate(injectedTallyProvider);
            } }
          >
            <>
              <TallyIcon />
              <Box sx={{ ml: 2 }}>Connect to Tally</Box>
            </>
          </Button>
        </>) :
        (
          <Button sx={{ mb: 3, width: "17em" }}
          onClick={() => {
            dispatch({ type: "startActivating", connector: injectedMetaMaskProvider });
            activate(injectedMetaMaskProvider);
          }}
        >
            <>
              <Icon name="plug" size="lg" />
              <Box sx={{ ml: 2 }}>Connect wallet</Box>
            </>
        </Button>
        )}
      </Flex>

      {connectionState.type === "failed" && (
        <Modal>
          <RetryDialog
            title={"Failed to connect to your wallet"}
            onCancel={() => dispatch({ type: "cancel" })}
            onRetry={() => {
              dispatch({ type: "retry" });
              activate(connectionState.connector);
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              You might need to install MetaMask or Tally wallet provider.
            </Box>
            <Flex sx={{ flexDirection: "column"}}>
              <Link sx={{ mt: 2, lineHeight: 2 }} href="https://metamask.io/download.html" target="_blank">
                Install Metamask <Icon size="xs" name="external-link-alt" />
              </Link>
              <Link sx={{ lineHeight: 2 }} href="https://docs.tally.cash/tally/the-wallet/getting-started" target="_blank">
                Install Tally <Icon size="xs" name="external-link-alt" />
              </Link>
            </Flex>
          </RetryDialog>
        </Modal>
      )}

      {(connectionState.type === "activating") && (
        <Modal>
          <ConnectionConfirmationDialog
            title={
              "Confirm connection with your wallet"
            }
            onCancel={() => dispatch({ type: "cancel" })}
          >
            <Text sx={{ textAlign: "center" }}>
              Confirm the request that&apos;s just appeared.
              {(<> If you can&apos;t see a request, open your MetaMask or Tally extension via your browser.</>)}
            </Text>
          </ConnectionConfirmationDialog>
        </Modal>
      )}

      {connectionState.type === "rejectedByUser" && (
        <Modal>
          <RetryDialog
            title="Cancel connection?"
            onCancel={() => dispatch({ type: "cancel" })}
            onRetry={() => {
              dispatch({ type: "retry" });
              activate(connectionState.connector);
            }}
          >
            <Text>To use Liquity, you need to connect your Ethereum account.</Text>
          </RetryDialog>
        </Modal>
      )}

      {connectionState.type === "alreadyPending" && (
        <Modal>
          <RetryDialog
            title="Connection already requested"
            onCancel={() => dispatch({ type: "cancel" })}
            onRetry={() => {
              dispatch({ type: "retry" });
              activate(connectionState.connector);
            }}
          >
            <Text>Please check your wallet and accept the connection request before retrying.</Text>
          </RetryDialog>
        </Modal>
      )}
    </>
  );
};
