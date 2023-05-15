import React, { ReactNode } from 'react';
import styled from 'styled-components';

interface TooltipProps {
  text: ReactNode | string;
  content: ReactNode | string;
  position: tooltipPositionType;
}

export enum tooltipPositionType {
  bottomLeft = 'bottomLeft',
  bottomCenter = 'bottomCenter',
  bottomRight = 'bottomRight',
}

const tooltipPosition = {
  bottomLeft: '24px',
  bottomCenter: '142px',
  bottomRight: '284px',
};

const Tooltip = ({ text, content, position = tooltipPositionType.bottomCenter }: TooltipProps) => {
  console.log('position ', position, tooltipPosition[position]);
  return (
    <>
      <TooltipCard>
        <TooltipText>{text}</TooltipText>
        <TooltipBox position={position}>{content}</TooltipBox>
      </TooltipCard>
    </>
  );
};

export default Tooltip;

const TooltipText = styled.div`
  width: fit-content;
  cursor: pointer;
`;
const TooltipBox = styled.div<{
  position?: tooltipPositionType;
}>`
  position: absolute;
  top: calc(100% + 10px);
  left: ${({ position }) => (position ? tooltipPosition[position] : tooltipPosition.bottomCenter)};
  visibility: hidden;
  width: 308px;
  padding: 0;
  border-radius: 18px;

  &:before {
    content: '';
    width: 10px;
    height: 10px;
    left: ${({ position }) => (position ? tooltipPosition[position] : tooltipPosition.bottomCenter)};
    top: -6px;
    position: absolute;
    background: ${({ theme }) => theme.color.background.tooltip};

    border-bottom: ${({ theme }) => theme.color.background.tooltipBorder};
    border-left: ${({ theme }) => theme.color.background.tooltipBorder};
    border-width: 1px;
    border-bottom-style: solid;
    border-left-style: solid;
    transform: rotate(135deg);
  }
`;
const TooltipCard = styled.div`
  position: relative;
  & ${TooltipText}:hover + ${TooltipBox} {
    visibility: visible;
    color: ${({ theme }) => theme.color.text.tooltip};
    background: ${({ theme }) => theme.color.background.tooltip};
    border: 1px solid ${({ theme }) => theme.color.background.tooltipBorder};
    width: 308px;
    font-size: 14px;
    z-index: 1;
  }
`;
