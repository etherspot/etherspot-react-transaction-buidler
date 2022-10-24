import React, { useEffect } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

interface LoginProps {
  connectWallet: () => void;
  connectedProvider: any;
}

const ConnectWalletButton = styled.span`
  padding: 10px;
  border: 1px solid #000;
  text-transform: uppercase;
  font-size: 12px;
  margin-right: 20px;
  font-family: "Arial", sans;
  cursor: pointer;
  margin-top: 20px;
  display: inline-block;

  &:hover {
    opacity: 0.4;
  }
`;

const LoginContainer = styled.div`
  width: 100%;
  height: 100vh;
`;

const Login = ({ connectWallet, connectedProvider }: LoginProps) => {
  const navigate = useNavigate();
  useEffect(() => {
    if (connectedProvider) {
      navigate("/home");
    }
  }, [connectedProvider]);
  return (
    <LoginContainer>
      <ConnectWalletButton onClick={connectWallet}>
        Connect wallet
      </ConnectWalletButton>
    </LoginContainer>
  );
};

export default Login;
