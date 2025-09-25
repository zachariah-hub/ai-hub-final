import React from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { Supplier, Product, TwilioConfig } from '../types';
import FileUpload from './FileUpload';
import DataTable from './DataTable';
import TwilioSettings from './TwilioSettings';

interface DataManagementProps {
  suppliers: Supplier[];
  products: Product[];
  setSuppliers: (suppliers: Supplier[]) => void;
  setProducts: (products: Product[]) => void;
  twilioConfig: TwilioConfig;
  setTwilioConfig: (config: TwilioConfig) => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ suppliers, products, setSuppliers, setProducts, twilioConfig, setTwilioConfig }) => {
  const { t } = useLocalization();

  const parseCsv = <T,>(csvText: string, headers: (keyof T)[]): T[] => {
    try {
      const lines = csvText.trim().split(/\r?\n/);
      // Allow empty files or files with only a header.
      if (lines.length < 2) return [];

      const dataLines = lines.slice(1);
      return dataLines.map(line => {
        // Handle potential commas within quoted fields
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const sanitizedValues = values.map(v => v.replace(/^"|"$/g, ''));
        
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = sanitizedValues[index] || '';
        });
        return obj as T;
      });
    } catch (error) {
      console.error("Failed to parse CSV:", error);
      return [];
    }
  };


  const handleSupplierUpload = (csvText: string) => {
    const headers: (keyof Supplier)[] = ['SupplierID', 'SupplierName', 'PhoneNumber', 'Specialty', 'ContactPerson'];
    const parsedData = parseCsv<Supplier>(csvText, headers);
    setSuppliers(parsedData);
  };

  const handleProductUpload = (csvText: string) => {
    const headers: (keyof Product)[] = ['ProductID', 'ProductName', 'ProductDescription_for_AI', 'UnitOfMeasure'];
    const parsedData = parseCsv<Product>(csvText, headers);
    setProducts(parsedData);
  };
  
  const supplierHeaders = [
      t('header.supplierId'), 
      t('header.supplierName'), 
      t('header.phone'), 
      t('header.specialty'), 
      t('header.contact')
  ];
  
  const productHeaders = [
      t('header.productId'),
      t('header.productName'),
      t('header.productDescription'),
      t('header.unitOfMeasure')
  ];

  return (
    <div className="space-y-8">
      <TwilioSettings config={twilioConfig} setConfig={setTwilioConfig} />

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">{t('data.suppliers.title')}</h2>
        <p className="text-gray-500 text-sm mt-1 mb-6">{t('data.suppliers.description')}</p>
        <FileUpload onFileUpload={handleSupplierUpload} />
        <div className="mt-6">
          <DataTable headers={supplierHeaders} data={suppliers} noDataMessage={t('data.noData')} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">{t('data.products.title')}</h2>
        <p className="text-gray-500 text-sm mt-1 mb-6">{t('data.products.description')}</p>
        <FileUpload onFileUpload={handleProductUpload} />
        <div className="mt-6">
          <DataTable headers={productHeaders} data={products} noDataMessage={t('data.noData')} />
        </div>
      </div>
    </div>
  );
};

export default DataManagement;