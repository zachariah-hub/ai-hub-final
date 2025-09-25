
import React from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { View } from '../types';
import DataIcon from './icons/DataIcon';
import BotIcon from './icons/BotIcon';
import SiteSurveyIcon from './icons/SiteSurveyIcon';
import InventoryIcon from './icons/InventoryIcon';
import AddIcon from './icons/AddIcon';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const { t } = useLocalization();

  const navItems = [
    { id: View.DATA_MANAGEMENT, label: t('nav.dataManagement'), icon: DataIcon },
  ];

  const botItems = [
    { id: View.BOT_RUNNER, label: t('nav.botRunner'), icon: BotIcon, active: true },
    { id: 'siteSurveyBot', label: t('nav.siteSurveyBot'), icon: SiteSurveyIcon, active: false },
    { id: 'inventoryBot', label: t('nav.inventoryBot'), icon: InventoryIcon, active: false },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col transition-all duration-300">
      <div className="bg-gray-900 text-white p-6 flex items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-wider uppercase">
          AI-OPS
        </h1>
      </div>
      <nav className="flex-1 px-4 py-6">
        <ul>
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => setActiveView(item.id)}
                className={`flex items-center w-full px-4 py-3 my-1 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50
                  ${
                    activeView === item.id
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <hr className="my-4 border-gray-700" />
        
        <h2 className="px-4 text-xs font-semibold uppercase text-gray-500 tracking-wider">Bot Agents</h2>
        <ul className="mt-2">
           {botItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => item.active && setActiveView(item.id as View)}
                disabled={!item.active}
                className={`flex items-center w-full px-4 py-3 my-1 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50
                  ${
                    activeView === item.id && item.active
                      ? 'bg-red-600 text-white shadow-lg'
                      : !item.active 
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${!item.active ? 'text-gray-600' : ''}`} />
                <span className={`${!item.active ? 'opacity-70' : ''}`}>{item.label}</span>
              </button>
            </li>
          ))}
            <li>
                <button
                    className="flex items-center w-full px-4 py-3 my-1 text-sm font-medium rounded-lg transition-all duration-200 border-2 border-dashed border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                    <AddIcon className="w-5 h-5 mr-3" />
                    <span>{t('nav.addBot')}</span>
                </button>
            </li>
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-800 text-xs text-center text-gray-600">
        © 2024 Operations Hub
      </div>
    </aside>
  );
};

export default Sidebar;
