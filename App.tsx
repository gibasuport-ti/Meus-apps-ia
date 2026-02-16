
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Asset, 
  TransportRequest, 
  RequestType, 
  RequestStatus, 
  DashboardStats 
} from './types';
import { fetchAssets, fetchRequests, createRequest, updateRequest, deleteRequest } from './services/api';
import Dashboard from './components/Dashboard';
import RequestList from './components/RequestList';
import AssetInventory from './components/AssetInventory';
import NewRequestModal from './components/NewRequestModal';

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'assets'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados da API (LocalStorage)
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [assetsData, requestsData] = await Promise.all([
        fetchAssets(),
        fetchRequests()
      ]);
      setAssets(assetsData);
      setRequests(requestsData);
    } catch (error) {
      console.error("Erro ao carregar dados locais:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable fullscreen: ${e.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const checkStatus = (request: TransportRequest): RequestStatus => {
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    if (request.status !== RequestStatus.COMPLETED && (Date.now() - request.createdAt > twoDaysInMs)) {
      return RequestStatus.DELAYED;
    }
    return request.status;
  };

  const updatedRequests = useMemo(() => {
    return requests.map(req => ({
      ...req,
      status: checkStatus(req)
    }));
  }, [requests]);

  const stats: DashboardStats = useMemo(() => {
    return {
      totalRequests: updatedRequests.length,
      pendingNF: updatedRequests.filter(r => r.type === RequestType.NF_REMESSA && r.status !== RequestStatus.COMPLETED).length,
      pendingTransport: updatedRequests.filter(r => r.type === RequestType.TRANSPORT && r.status !== RequestStatus.COMPLETED).length,
      delayedCount: updatedRequests.filter(r => r.status === RequestStatus.DELAYED).length,
    };
  }, [updatedRequests]);

  const handleAddRequest = async (newReq: TransportRequest) => {
    try {
      await createRequest(newReq);
      await loadData(); 
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao criar requisição:", error);
      alert("Erro ao salvar dados localmente.");
    }
  };

  const handleUpdateContent = async (id: string, updates: Partial<TransportRequest>) => {
    try {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      await updateRequest(id, updates);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      loadData(); 
    }
  };

  const handleDeleteRequest = async (id: string) => {
    try {
      await deleteRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir registro.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
        <i className="fas fa-database text-4xl text-blue-600 mb-4 animate-bounce"></i>
        <p className="font-bold">Carregando dados locais...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8faff] dark:bg-slate-950 transition-colors duration-300">
      {/* Sidebar - Professional Deep Blue */}
      <aside className="w-full md:w-72 bg-[#0f172a] text-white flex-shrink-0 shadow-2xl z-20 flex flex-col">
        <div className="p-6 md:p-8 flex items-center justify-between md:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 md:p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
              <i className="fas fa-truck-fast text-xl md:text-2xl"></i>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase leading-none">AssetLogix</h1>
              <span className="text-[9px] md:text-[10px] text-blue-400 font-bold uppercase tracking-widest">Local Mode</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={toggleTheme}
              className="md:hidden bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
              title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
            >
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <button 
              onClick={toggleFullscreen}
              className="md:hidden bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Tela Cheia"
            >
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="md:hidden bg-blue-600 p-2 rounded-lg text-white"
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>
        </div>
        
        <nav className="px-4 md:px-5 pb-4 md:pb-0 space-y-1 md:space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible no-scrollbar">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <i className={`fas fa-chart-pie w-5 text-center ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-500'}`}></i>
            <span className="text-sm md:text-base">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <i className={`fas fa-exchange-alt w-5 text-center ${activeTab === 'requests' ? 'text-white' : 'text-slate-500'}`}></i>
            <span className="text-sm md:text-base">Solicitações</span>
          </button>
          <button 
            onClick={() => setActiveTab('assets')}
            className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === 'assets' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <i className={`fas fa-layer-group w-5 text-center ${activeTab === 'assets' ? 'text-white' : 'text-slate-500'}`}></i>
            <span className="text-sm md:text-base">Inventário</span>
          </button>
        </nav>

        <div className="mt-auto p-6 hidden md:block border-t border-slate-800/50 space-y-3">
          <div className="flex gap-2">
            <button 
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all border border-slate-800"
            >
              <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
              {isDarkMode ? 'Light' : 'Dark'}
            </button>
            <button 
              onClick={toggleFullscreen}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-all border border-slate-800"
            >
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
              Full
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-blue-50 text-blue-700 font-bold py-4 rounded-xl hover:bg-white transition-all flex items-center justify-center gap-3 shadow-xl hover:-translate-y-1 active:translate-y-0"
          >
            <i className="fas fa-plus-circle"></i>
            Nova Requisição
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-12 overflow-y-auto overflow-x-hidden">
        <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-blue-100 dark:border-slate-800 pb-6 md:pb-8 transition-colors">
          <div className="text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight capitalize transition-colors">{activeTab}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm md:text-base transition-colors">Gerenciamento centralizado de ativos TI.</p>
          </div>
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
             <div className="flex flex-1 items-center bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-blue-100 dark:border-slate-700 shadow-sm gap-3 transition-colors">
                <i className="fas fa-search text-slate-400"></i>
                <input type="text" placeholder="Buscar..." className="bg-transparent outline-none text-sm w-full md:w-48 text-slate-600 dark:text-slate-200 placeholder-slate-400" />
             </div>
             <button 
              onClick={() => setIsModalOpen(true)}
              className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 items-center gap-2"
            >
              <i className="fas fa-plus"></i> Novo
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard stats={stats} recentRequests={updatedRequests.slice(0, 5)} onComplete={(id) => handleUpdateContent(id, { status: RequestStatus.COMPLETED })} />}
          {activeTab === 'requests' && <RequestList requests={updatedRequests} assets={assets} onUpdate={handleUpdateContent} onDelete={handleDeleteRequest} />}
          {activeTab === 'assets' && <AssetInventory assets={assets} />}
        </div>

        {isModalOpen && (
          <NewRequestModal 
            assets={assets} 
            onClose={() => setIsModalOpen(false)} 
            onSubmit={handleAddRequest} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
