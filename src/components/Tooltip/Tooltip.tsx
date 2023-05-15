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
  bottomLeft: 265,
  bottomCenter: 142,
  bottomRight: 24,
};

const Tooltip = ({ text, content, position = tooltipPositionType.bottomCenter }: TooltipProps) => (
  <TooltipCard>
    <TooltipText>{text}</TooltipText>
    <TooltipBox position={position}>{content}</TooltipBox>
  </TooltipCard>
);

export default Tooltip;

const TooltipText = styled.div`
  width: fit-content;
  cursor: pointer;
`;
const TooltipBox = styled.div<{
  position?: tooltipPositionType;
}>`
  position: absolute;
  top: calc(100% + 5px);
  left: ${({ position }) => `-${position ? tooltipPosition[position] : tooltipPosition.bottomCenter}px`};
  visibility: hidden;
  width: 310px;
  padding: 0;
  border-radius: 18px;

  &:before {
    content: '';
    width: 10px;
    height: 10px;
    left: ${({ position }) => `${(position ? tooltipPosition[position] : tooltipPosition.bottomCenter) + 5}px`};
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
    width: 310px;
    font-size: 14px;
    padding: 8px 0px 8px 12px;
    text-align: left;
    font-weight: 500;
    font-stretch: normal;
    font-style: normal;
    line-height: 1.29;
    letter-spacing: normal;
    z-index: 1;
  }
`;
