import React, { useEffect } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

interface HomeProps {
  connectedProvider: any;
}

const StyledButton = styled.span`
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

const Home = ({ connectedProvider }: HomeProps) => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!connectedProvider) {
      window.location.href = "/";
    }
  }, []);

  return (
    <div>
      <StyledButton onClick={() => navigate("/send")}>Send Screen</StyledButton>
      <StyledButton onClick={() => navigate("/single-swap")}>
        Single Chain Swap Screen
      </StyledButton>
      <StyledButton onClick={() => navigate("/cross-swap")}>
        Cross Chain Swap Screen
      </StyledButton>
    </div>
  );
};

export default Home;
