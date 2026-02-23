import { useState, useMemo, useEffect } from "react";

export function usePagination<T>(items: T[], itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPageState, setItemsPerPageState] = useState(itemsPerPage);

  // Resetar para página 1 quando itemsPerPage mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPageState]);

 useEffect(() => {
  setCurrentPage(1);
}, [items.length]);


  const totalPages = Math.ceil(items.length / itemsPerPageState);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPageState;
    const endIndex = startIndex + itemsPerPageState;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPageState]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Resetar para página 1 quando os itens mudarem
  const resetPagination = () => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    previousPage,
    resetPagination,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    startIndex: (currentPage - 1) * itemsPerPageState,
    endIndex: Math.min(currentPage * itemsPerPageState, items.length),
    totalItems: items.length,
    itemsPerPage: itemsPerPageState,
    setItemsPerPage: setItemsPerPageState,
  };
}

