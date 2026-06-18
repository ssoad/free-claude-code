import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface BrandContextType {
  brandName: string;
}

const BrandContext = createContext<BrandContextType>({ brandName: 'Aura' });

export const useBrand = () => useContext(BrandContext);

export const BrandProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [brandName, setBrandName] = useState<string>('Aura');

  useEffect(() => {
    fetch('/api/public_config')
      .then(res => res.json())
      .then(data => {
        if (data && data.brand_name) {
          setBrandName(data.brand_name);
          document.title = data.brand_name;
        }
      })
      .catch(err => console.error('Failed to load public config', err));
  }, []);

  return (
    <BrandContext.Provider value={{ brandName }}>
      {children}
    </BrandContext.Provider>
  );
};
