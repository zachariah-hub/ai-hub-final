import React, { useState, useEffect } from 'react';
import { LocalizationProvider } from './context/LocalizationContext';
import Sidebar from './components/Sidebar';
import DataManagement from './components/DataManagement';
import BotRunner from './components/BotRunner';
import Header from './components/Header';
import { View, Supplier, Product, TwilioConfig } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.BOT_RUNNER);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [twilioConfig, setTwilioConfig] = useState<TwilioConfig>({
    accountSid: '',
    authToken: '',
    fromNumber: '',
  });
  
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/get-config');
        if (response.ok) {
          const data = await response.json();
          // Only update if the fetched data has content, to avoid overwriting user input on a blank server state
          if (data && (data.accountSid || data.authToken || data.fromNumber)) {
            setTwilioConfig(data);
          }
        }
      } catch (error) {
        console.error("Could not fetch initial Twilio config:", error);
      }
    };
    fetchConfig();
  }, []);


  const renderMainContent = () => {
    switch (activeView) {
      case View.DATA_MANAGEMENT:
        return (
          <DataManagement
            suppliers={suppliers}
            products={products}
            setSuppliers={setSuppliers}
            setProducts={setProducts}
            twilioConfig={twilioConfig}
            setTwilioConfig={setTwilioConfig}
          />
        );
      case View.BOT_RUNNER:
      default:
        return <BotRunner suppliers={suppliers} products={products} twilioConfig={twilioConfig} />;
    }
  };

  return (
    <LocalizationProvider>
      <div className="flex h-screen bg-gray-100 font-sans">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto">
            <Header />
            <div className="flex-1">
              {renderMainContent()}
            </div>
          </div>
        </main>
      </div>
    </LocalizationProvider>
  );
};

export default App;