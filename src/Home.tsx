import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";

import Skeleton from './logo.svg';
import { randomBytes } from "crypto";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

interface NFTItem {
  name: string;
}

const indexes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const items = [
  {name: '1'},
  {name: '2'},
  {name: '3'},
  {name: '4'},
  {name: '5'},
  {name: '6'},
  {name: '7'},
  {name: '8'},
  {name: '9'},
  {name: '10'},
  {name: '11'},
  {name: '12'},
];
const myItems = [
  {name: '11'},
  {name: '12'},
];

const Home = (props: HomeProps) => {
  const [curPage, setCurPage] = useState(0);
  const [curItems, setCurItems] = useState<NFTItem[]>(items);
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      } else {
        setCurItems(curItems);
        setCurPage(0);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);

  return (
    <main style={{position: 'relative'}}>
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        minHeight: 100,
      }}
      >
        {wallet && <span style={{width: 80, cursor: 'pointer', margin: 20}} onClick={() => {
          setCurPage(0);
          setCurItems(items);
        }}>Home</span>}
        {wallet && <span style={{width: 80, cursor: 'pointer', margin: 20}} onClick={() => {
          setCurPage(1);
          setCurItems(myItems);
        }}>My heroes</span>}
      </div>
      {wallet && (
        <div style={{width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <div>
            <p>Total Available: {itemsAvailable}</p>
            <p>Redeemed: {itemsRedeemed}</p>
            <p>Remaining: {itemsRemaining}</p>
          </div>
          <div>
            <p>Wallet {shortenAddress(wallet.publicKey.toBase58() || "")}</p>
            <p>Balance: {(balance || 0).toLocaleString()} SOL</p>
          </div>
        </div>
      )}

      <MintContainer>
        {!wallet ? (
          <>
          <ConnectButton style={{position: 'absolute', right: 0, top: 0}}>Connect Wallet</ConnectButton>
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 1100
          }}>
            { indexes.map((item, idx) => 
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                width: 200,
                margin: 30,
              }}>
                <div
                  style={{
                    position: 'relative',
                    backgroundColor: 'rgba(50, 50, 0, 0.5)',
                  }}
                  >
                  <img
                    alt={'back' + idx}
                    src={Skeleton}
                    width={200}
                    height={200}
                    style={{
                      backgroundColor: 'rgba(50, 50, 0, 0.5)',
                      zIndex: -1,
                    }}
                  />
                </div>
                <MintButton
                  disabled={true}
                  onClick={onMint}
                  variant="contained"
                >
                  MINT
                </MintButton>
              </div>
            )}
          </div>
          </>
        ) : 
        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 1100
        }}
        >
          {curItems.map((item, idx) => 
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              width: 200,
              margin: 30,
            }}>
              <div
                style={{
                  position: 'relative',
                  backgroundColor: 'rgba(50, 50, 0, 0.5)',
                }}
                >
                <img
                  alt={'' + idx}
                  src={"https://placeimg.com/200/200/"+idx}
                  style={{
                    minWidth: 200,
                    minHeight: 200,
                    zIndex: 1,
                  }}
                />
                <img
                  alt={'back' + idx}
                  src={Skeleton}
                  width={200}
                  height={200}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    backgroundColor: 'rgba(50, 50, 0, 0.5)',
                    zIndex: -1,
                  }}
                />
              </div>
              <MintButton
                disabled={isSoldOut || isMinting || !isActive}
                onClick={onMint}
                variant="contained"
              >
                {isSoldOut ? (
                  "SOLD OUT"
                ) : isActive ? (
                  isMinting ? (
                    <CircularProgress />
                  ) : (
                    "MINT"
                  )
                ) : (
                  <Countdown
                    date={startDate}
                    onMount={({ completed }) => completed && setIsActive(true)}
                    onComplete={() => setIsActive(true)}
                    renderer={renderCounter}
                  />
                )}
              </MintButton>
            </div>
          )}
        </div>
        }
      </MintContainer>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;