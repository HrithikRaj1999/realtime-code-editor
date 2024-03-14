import React, { createContext, useContext, useState } from "react";
import { propsType } from "../utils/types";

interface UserInfoType {
  [key: string]: React.ReactNode;
}
interface userContextType {
  user: UserInfoType | null;
  setUser: React.Dispatch<React.SetStateAction<UserInfoType | null>>;
}

const UserContext = createContext<userContextType | undefined>(undefined);

const UserContextProvider: React.FC<propsType> = ({ children }) => {
  const [user, setUser] = useState<UserInfoType | null>(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    // This ensures TypeScript knows context is never undefined when used
    throw new Error("useUserContext must be used within a UserContextProvider");
  }
  return context;
};

export default UserContextProvider;
