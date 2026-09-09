import { useContext } from "react";
import { MainScrollContext } from "../../contexts/MainScrollContext";

export const useMainScrollRef = () => useContext(MainScrollContext);
