import React, { useState } from 'react';
import { Trash2, X, Search, Filter, Calendar, Eye } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import cam1 from '../assets/cam1.png';
import cam2 from '../assets/cam2.png';
import cam3 from '../assets/cam3.png';
import cam4 from '../assets/cam4.png';
import cam5 from '../assets/cam5.png';
import cam6 from '../assets/cam6.png';
import cam7 from '../assets/cam7.png';

interface LearnedProduct {
  id: number;
  streamerName: string;
  date: string;
  images: string[];
}

export const LearnedProducts: React.FC = () => {
  const { theme } = useTheme();
  
  // Örnek veri
  const [products] = useState<LearnedProduct[]>([
    {
      id: 1,
      streamerName: "RaspberryPi-001",
      date: "2024-06-15",
      images: [cam1, cam3, cam5]
    },
    {
      id: 2,
      streamerName: "RaspberryPi-002",
      date: "2024-06-14",
      images: [cam2, cam7]
    },
    {
      id: 3,
      streamerName: "RaspberryPi-003",
      date: "2024-06-13",
      images: [cam4, cam1, cam6, cam3]
    },
    {
      id: 4,
      streamerName: "RaspberryPi-004",
      date: "2024-06-12",
      images: [cam7]
    },
    {
      id: 5,
      streamerName: "RaspberryPi-005",
      date: "2024-06-11",
      images: [cam2, cam4, cam6]
    },
  ]);

  // State yönetimi
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const handleImageClick = (images: string[], index: number = 0) => {
    setSelectedImages(images);
    setCurrentImageIndex(index);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedImages([]);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % selectedImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + selectedImages.length) % selectedImages.length);
  };

  const handleDelete = (id: number) => {
    // Silme işlemi burada yapılacak
    console.log(`Deleting learned product ${id}`);
  };

  // Filtreleme
  const filteredProducts = products.filter(product => 
    product.streamerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.id.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
          Learned Products
        </h1>
        <p className="mt-2 lg:mt-3 text-sm sm:text-base lg:text-lg text-muted-foreground">
          Products learned and recognized by the AI system
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search by ID or streamer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-80 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Filter buttons */}
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm font-medium">
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Date Range
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card shadow rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Streamer Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Images</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.map((product) => (
                <tr 
                  key={product.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={(e) => {
                    // Sadece satırdaki butonlara tıklanmadıysa image gallery'yi aç
                    if (!(e.target as HTMLElement).closest('button')) {
                      handleImageClick(product.images);
                    }
                  }}
                >
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-foreground">#{product.id}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-foreground">{product.streamerName}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-muted-foreground">{product.date}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {product.images.slice(0, 3).map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`Product ${product.id} - ${index + 1}`}
                            className="w-10 h-10 rounded-md border-2 border-background object-cover cursor-pointer hover:scale-110 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageClick(product.images, index);
                            }}
                          />
                        ))}
                        {product.images.length > 3 && (
                          <div 
                            className="w-10 h-10 rounded-md border-2 border-background bg-muted flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageClick(product.images, 3);
                            }}
                          >
                            <span className="text-xs font-medium text-muted-foreground">+{product.images.length - 3}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageClick(product.images);
                        }}
                        className="ml-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                        title="View all images"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(product.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors"
                      title="Delete product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No learned products found.</p>
          </div>
        )}
      </div>

      {/* Image Gallery Modal */}
      {modalOpen && selectedImages.length > 0 && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 ${
            theme === 'dark' ? 'bg-black/60' : 'bg-black/40'
          }`}
          onClick={handleCloseModal}
        >
          <div
            className={`relative max-w-4xl max-h-[90vh] ${
              theme === 'dark' ? 'bg-slate-800' : 'bg-white'
            } rounded-lg border border-border overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Product Images ({currentImageIndex + 1} / {selectedImages.length})
              </h3>
              <button
                onClick={handleCloseModal}
                className={`p-2 rounded-md transition-colors ${
                  theme === 'dark' 
                    ? 'text-gray-400 hover:text-white hover:bg-slate-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image Display */}
            <div className="relative">
              <img
                src={selectedImages[currentImageIndex]}
                alt={`Product image ${currentImageIndex + 1}`}
                className="w-full max-h-[70vh] object-contain"
              />
              
              {/* Navigation buttons */}
              {selectedImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className={`absolute left-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors ${
                      theme === 'dark' 
                        ? 'bg-slate-700 text-white hover:bg-slate-600' 
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                    } shadow-lg`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextImage}
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors ${
                      theme === 'dark' 
                        ? 'bg-slate-700 text-white hover:bg-slate-600' 
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                    } shadow-lg`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {selectedImages.length > 1 && (
              <div className={`p-4 border-t ${
                theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
              }`}>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedImages.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className={`w-16 h-16 object-cover rounded cursor-pointer transition-all ${
                        index === currentImageIndex 
                          ? 'ring-2 ring-primary scale-110' 
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnedProducts;