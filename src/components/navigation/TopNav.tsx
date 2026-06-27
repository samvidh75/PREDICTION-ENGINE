import React from "react";
import Logo from "../brand/Logo";
import { productNavigate } from "../product/ProductUI";

export const TopNav: React.FC = () => {
  return (
    <header style={{
      height: "64px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid #E5E5E5",
      padding: "0 24px",
      background: "#FFFFFF",
      width: "100%",
    }}>
      <div 
        onClick={() => productNavigate("dashboard")} 
        style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
      >
        <Logo />
      </div>
    </header>
  );
};

export default TopNav;
