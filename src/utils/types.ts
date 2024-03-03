import {
  ChangeEvent,
  Dispatch,
  KeyboardEventHandler,
  MouseEvent, SetStateAction
} from "react";
import { NavigateFunction } from "react-router-dom";
export interface InformationTypes {
  roomId: string;
  username: string;
  isCreateRoom: boolean;
}

export type UseRoomCreateReturn = [
  InformationTypes,
  Dispatch<SetStateAction<InformationTypes>>,
  (e: MouseEvent<HTMLElement, globalThis.MouseEvent>) => void,
  (e: ChangeEvent<HTMLInputElement>) => void,
  (e: ChangeEvent<HTMLInputElement>) => void,
  () => void,
  NavigateFunction,
  (e: React.KeyboardEvent<HTMLInputElement>)=>void
];
