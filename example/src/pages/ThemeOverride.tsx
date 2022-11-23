import React, { useEffect, useState, useMemo } from "react";
import {
  Etherspot,
  TRANSACTION_BLOCK_TYPE,
} from "@etherspot/react-transaction-buidler";
import styled from "styled-components";

interface ThemeOverrideProps {
  connectedProvider: any;
  chainId: number;
}

const ToggleThemeButton = styled.span`
  padding: 10px;
  display: inline-block;
  border: 1px solid #000;
  text-transform: uppercase;
  font-size: 12px;
  margin-right: 20px;
  font-family: "Arial", sans;
  cursor: pointer;
  margin-bottom: 15px;

  &:hover {
    opacity: 0.4;
  }
`;

const ThemeOverride = ({ connectedProvider, chainId }: ThemeOverrideProps) => {
  /**
   * This is the Theme Override page
   *
   * @important  this page demontrates the Theme Override functionality implemented through the Builder Component
   *
   * @note The Etherspot component requires at least 3 parameters
   *
   * @param {array} defaultTransactionBlocks this parameter takes and array of object that requres type as must the type can be of -
   *
   * 1. @param {String} SEND_ASSET
   * 2. @param {String} ASSET_SWAP
   * 3. @param {String} ASSET_BRIDGE We're demonstrating the send functionality here
   *
   * @param {provider} provider - this parameter requires the connection provider
   *
   * @param {number} chainId - this parameter requires the chain ID
   *
   * @param {themeOverride} themeOverride - this parameter takes in the configurable colors
   *
   */

  // this is the state variable just there for the toggle functionality of theme
  const [useDashboardTheme, setUseDashboardTheme] = useState(false);

  const themeOverride = useMemo(() => {
    if (!useDashboardTheme) return undefined;
    return {
      color: {
        background: {
          main: "#221f33",
          topMenu: "#443d66",
          topMenuButton: "#ff884d",
          card: "#2b2640",
          button: "#ff884d",
          closeButton: "#ff884d",
          selectInputToggleButton: "#ff884d",
          selectInput: "#443d66",
          selectInputExpanded: "#1a1726",
          selectInputImagePlaceholder: "#443d66",
          textInput: "#1a1726",
          switchInput: "#1a1726",
          switchInputActiveTab: "#443d66",
          switchInputInactiveTab: "transparent",
          pill: "#2b2640",
          checkboxInputInactive: "#665c99",
          toDropdownColor: "#F8EFEA",
          selectInputExpandedHover: "#F8EFEA",
        },
        text: {
          selectInput: "#ffeee6",
          selectInputOption: "#ffeee6",
          selectInputOptionSecondary: "#ffeee6",
          searchInput: "#998ae6",
          searchInputSecondary: "#998ae6",
          outerLabel: "#998ae6",
          innerLabel: "#998ae6",
          topMenu: "#998ae6",
          main: "#ffeee6",
          topBar: "#998ae6",
          buttonSecondary: "#998ae6",
          card: "#ffeee6",
          cardTitle: "#ffeee6",
          button: "#fff",
          errorMessage: "#ff4d6a",
          textInput: "#ffeee6",
          textInputSecondary: "#ffeee6",
          switchInputActiveTab: "#ffeee6",
          switchInputInactiveTab: "#bbb8cc",
          selectInputImagePlaceholder: "#ffeee6",
          cardDisabled: "#605e5e",
          pill: "#bbb8cc",
          pillValue: "#ffeee6",
        },
      },
    };
  }, [useDashboardTheme]);

  useEffect(() => {
    if (!connectedProvider) {
      window.location.href = "/";
    }
  }, []);

  return (
    <div>
      <ToggleThemeButton
        onClick={() => setUseDashboardTheme(!useDashboardTheme)}
      >
        Toggle theme
      </ToggleThemeButton>
      <Etherspot
        defaultTransactionBlocks={[
          { type: TRANSACTION_BLOCK_TYPE.ASSET_BRIDGE },
        ]}
        provider={connectedProvider}
        chainId={chainId}
        themeOverride={themeOverride}
      />
    </div>
  );
};

export default ThemeOverride;
