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
  /**
   * This is the home page
   *
   * @important  this page has the list of transactions can be performed with the builder component
   * On click of every button the user will be directed to the specific routes where they can perform their
   * required transactions
   *
   * An example would be on clicking of the @param {string} navigate function, will move the user to the specific page assuming the
   */

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
      <StyledButton onClick={() => navigate("/theme-override")}>
        Theme Override
      </StyledButton>
      <StyledButton onClick={() => navigate("/hidden-add-btn")}>
        Hidden Add Transaction
      </StyledButton>
      <StyledButton onClick={() => navigate("/hidden-transaction-block")}>
        Hidden Transaction Block
      </StyledButton>
    </div>
  );
};

export default Home;
