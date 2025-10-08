import { useState } from 'react';
import { SidebarOption } from '../types';

export const useSidebar = () => {
  const [selectedOption, setSelectedOption] = useState<SidebarOption>(null);

  const handleSelectOption = (option: SidebarOption) => {
    setSelectedOption(option);
  };

  return {
    selectedOption,
    handleSelectOption,
  };
};
