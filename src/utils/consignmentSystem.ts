import type {
  ConsignmentMarketState,
  ConsignmentWork,
  ArtistInfo,
  BuyerInfo,
  TradeOrder,
  DigitalCertificate,
  ConsignmentWorkStatus,
  TradeOrderStatus,
  CertificateType,
  ConsignmentMarketFilter,
  ConsignmentMarketStatistics,
  ConsignmentMarketTab
} from '../types/game';
import { generateId } from './math';
import { PHOTO_SUBJECTS, FILM_STOCKS } from '../data/gameData';

export const CONSIGNMENT_TABS: { id: string; label: string; icon: string }[] = [
  { id: 'market', label: '作品市场', icon: '🏪' },
  { id: 'my_works', label: '我的寄售', icon: '🎨' },
  { id: 'my_orders', label: '我的订单', icon: '📦' },
  { id: 'certificates', label: '证书收藏', icon: '🏅' },
  { id: 'artist_profile', label: '艺术家主页', icon: '👤' }
];

export const WORK_STATUS_LABELS: Record<ConsignmentWorkStatus, string> = {
  draft: '草稿',
  listed: '在售',
  reserved: '预留中',
  sold: '已售出',
  archived: '已归档',
  removed: '已下架'
};

export const WORK_STATUS_COLORS: Record<ConsignmentWorkStatus, string> = {
  draft: '#909399',
  listed: '#67c23a',
  reserved: '#e6a23c',
  sold: '#409eff',
  archived: '#909399',
  removed: '#f56c6c'
};

export const ORDER_STATUS_LABELS: Record<TradeOrderStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  paid: '已付款',
  delivered: '已发货',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款'
};

export const ORDER_STATUS_COLORS: Record<TradeOrderStatus, string> = {
  pending: '#e6a23c',
  confirmed: '#409eff',
  paid: '#67c23a',
  delivered: '#909399',
  completed: '#67c23a',
  cancelled: '#f56c6c',
  refunded: '#f56c6c'
};

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  ownership: '所有权证书',
  authenticity: '真品证书',
  limited_edition: '限量版证书',
  artist_proof: '艺术家试印证明'
};

const DEFAULT_ARTISTS: ArtistInfo[] = [
  {
    id: 'artist_001',
    name: '林墨',
    bio: '独立摄影师，专注于街头摄影和人文纪实，作品曾在多个国际摄影展展出。',
    style: '街头纪实',
    totalWorks: 24,
    totalSales: 156,
    rating: 4.8,
    joinedAt: Date.now() - 86400000 * 365,
    verified: true,
    socialLinks: {
      instagram: '@linmo_photo'
    }
  },
  {
    id: 'artist_002',
    name: '苏晚',
    bio: '胶片爱好者，擅长风光和人像摄影，追求光影的极致表达。',
    style: '风光人像',
    totalWorks: 18,
    totalSales: 89,
    rating: 4.6,
    joinedAt: Date.now() - 86400000 * 200,
    verified: true
  },
  {
    id: 'artist_003',
    name: '陈景深',
    bio: '暗房工艺匠人，专注传统黑白银盐工艺，作品极具收藏价值。',
    style: '黑白艺术',
    totalWorks: 12,
    totalSales: 67,
    rating: 4.9,
    joinedAt: Date.now() - 86400000 * 500,
    verified: true
  }
];

const DEFAULT_BUYERS: BuyerInfo[] = [
  {
    id: 'buyer_001',
    name: '收藏家王先生',
    totalPurchases: 12,
    totalSpent: 25800,
    joinedAt: Date.now() - 86400000 * 180,
    favoriteWorkIds: []
  },
  {
    id: 'buyer_002',
    name: '画廊主理人',
    totalPurchases: 28,
    totalSpent: 89600,
    joinedAt: Date.now() - 86400000 * 300,
    favoriteWorkIds: []
  }
];

function generateWorkNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ART-${year}${month}-${random}`;
}

function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}

function generateCertificateNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT-${year}-${random}`;
}

function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function createInitialConsignmentMarketState(): ConsignmentMarketState {
  const defaultWorks = generateSampleWorks();
  
  return {
    works: defaultWorks,
    artists: DEFAULT_ARTISTS,
    buyers: DEFAULT_BUYERS,
    orders: [],
    certificates: generateSampleCertificates(defaultWorks),
    activeTab: 'market',
    filter: {
      searchKeyword: '',
      artistIds: [],
      categories: [],
      priceMin: undefined,
      priceMax: undefined,
      statuses: ['listed'],
      sortBy: 'date_desc',
      onlyAvailable: true,
      onlyVerifiedArtists: false
    },
    selectedWorkId: null,
    selectedOrderId: null,
    selectedCertificateId: null,
    currentUserId: 'artist_001',
    currentUserType: 'both',
    showWorkDetail: false,
    showOrderDetail: false,
    showCertificateDetail: false,
    showCreateWork: false,
    editingWorkId: null
  };
}

function generateSampleWorks(): ConsignmentWork[] {
  const works: ConsignmentWork[] = [];
  const sampleTitles = [
    { title: '城市微光', category: '街头', tags: ['城市', '夜景', '胶片'] },
    { title: '山海之间', category: '风光', tags: ['山水', '自然', '长曝光'] },
    { title: '时光肖像', category: '人像', tags: ['人像', '黑白', '经典'] },
    { title: '寂静街道', category: '街头', tags: ['街头', '清晨', '宁静'] },
    { title: '光影诗行', category: '风光', tags: ['光影', '诗意', '胶片'] },
    { title: '日常碎片', category: '纪实', tags: ['生活', '纪实', '日常'] }
  ];

  for (let i = 0; i < 6; i++) {
    const artist = DEFAULT_ARTISTS[i % DEFAULT_ARTISTS.length];
    const sample = sampleTitles[i];
    const price = (Math.floor(Math.random() * 20) + 5) * 100;
    const totalEditions = [5, 10, 20, 50][Math.floor(Math.random() * 4)];
    const edition = Math.floor(Math.random() * totalEditions) + 1;
    
    works.push({
      id: generateId(),
      workNumber: generateWorkNumber(),
      photoId: `sample_${i}`,
      artistId: artist.id,
      artistName: artist.name,
      title: sample.title,
      description: `这是一幅关于${sample.category}的摄影作品，采用传统胶片工艺制作。作品捕捉了${sample.tags.join('、')}的独特瞬间。`,
      edition,
      totalEditions,
      price,
      currency: 'CNY',
      status: i < 4 ? 'listed' : 'sold',
      category: sample.category,
      tags: sample.tags,
      listedAt: Date.now() - 86400000 * (i + 1) * 3,
      soldAt: i >= 4 ? Date.now() - 86400000 * i : undefined,
      buyerId: i >= 4 ? 'buyer_001' : undefined,
      royalties: 15,
      frameOption: true,
      framePrice: 200,
      shippingPrice: 50,
      createdAt: Date.now() - 86400000 * (i + 1) * 7,
      updatedAt: Date.now() - 86400000 * (i + 1) * 3
    });
  }

  return works;
}

function generateSampleCertificates(works: ConsignmentWork[]): DigitalCertificate[] {
  const soldWorks = works.filter(w => w.status === 'sold');
  return soldWorks.map(work => ({
    id: generateId(),
    certificateNumber: generateCertificateNumber(),
    type: 'limited_edition',
    workId: work.id,
    workTitle: work.title,
    workNumber: work.workNumber,
    artistId: work.artistId,
    artistName: work.artistName,
    ownerId: work.buyerId || 'buyer_001',
    ownerName: '收藏家王先生',
    editionNumber: work.edition,
    totalEditions: work.totalEditions,
    issueDate: work.soldAt || Date.now(),
    verificationCode: generateVerificationCode(),
    verified: true
  }));
}

export function createConsignmentWork(
  state: ConsignmentMarketState,
  data: {
    photoId: string;
    title: string;
    description: string;
    price: number;
    totalEditions: number;
    category?: string;
    tags: string[];
    frameOption?: boolean;
    framePrice?: number;
    shippingPrice?: number;
    royalties?: number;
  }
): ConsignmentMarketState {
  const currentArtist = state.artists.find(a => a.id === state.currentUserId);
  
  const newWork: ConsignmentWork = {
    id: generateId(),
    workNumber: generateWorkNumber(),
    photoId: data.photoId,
    artistId: state.currentUserId,
    artistName: currentArtist?.name || '未知艺术家',
    title: data.title,
    description: data.description,
    edition: 1,
    totalEditions: data.totalEditions,
    price: data.price,
    currency: 'CNY',
    status: 'draft',
    category: data.category,
    tags: data.tags,
    royalties: data.royalties ?? 10,
    frameOption: data.frameOption ?? false,
    framePrice: data.framePrice,
    shippingPrice: data.shippingPrice,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return {
    ...state,
    works: [...state.works, newWork]
  };
}

export function updateConsignmentWork(
  state: ConsignmentMarketState,
  workId: string,
  updates: Partial<ConsignmentWork>
): ConsignmentMarketState {
  return {
    ...state,
    works: state.works.map(work =>
      work.id === workId
        ? { ...work, ...updates, updatedAt: Date.now() }
        : work
    )
  };
}

export function listWork(state: ConsignmentMarketState, workId: string): ConsignmentMarketState {
  return updateConsignmentWork(state, workId, {
    status: 'listed',
    listedAt: Date.now()
  });
}

export function removeWork(state: ConsignmentMarketState, workId: string): ConsignmentMarketState {
  return updateConsignmentWork(state, workId, {
    status: 'removed'
  });
}

export function reserveWork(
  state: ConsignmentMarketState,
  workId: string,
  buyerId: string,
  reserveDurationMs: number = 86400000
): ConsignmentMarketState {
  return updateConsignmentWork(state, workId, {
    status: 'reserved',
    reservedBy: buyerId,
    reserveExpiresAt: Date.now() + reserveDurationMs
  });
}

export function createTradeOrder(
  state: ConsignmentMarketState,
  data: {
    workId: string;
    buyerId: string;
    includeFrame?: boolean;
    shippingAddress?: string;
    specialInstructions?: string;
  }
): ConsignmentMarketState {
  const work = state.works.find(w => w.id === data.workId);
  if (!work) return state;

  const buyer = state.buyers.find(b => b.id === data.buyerId);
  const includeFrame = data.includeFrame ?? false;
  const framePrice = includeFrame && work.framePrice ? work.framePrice : 0;
  const shippingPrice = work.shippingPrice ?? 0;
  const totalAmount = work.price + framePrice + shippingPrice;

  const newOrder: TradeOrder = {
    id: generateId(),
    orderNumber: generateOrderNumber(),
    workId: work.id,
    workTitle: work.title,
    workNumber: work.workNumber,
    sellerId: work.artistId,
    sellerName: work.artistName,
    buyerId: data.buyerId,
    buyerName: buyer?.name || '未知买家',
    price: work.price,
    framePrice,
    shippingPrice,
    totalAmount,
    currency: work.currency,
    status: 'pending',
    includeFrame,
    shippingAddress: data.shippingAddress,
    specialInstructions: data.specialInstructions,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const updatedWorkState = updateConsignmentWork(state, data.workId, {
    status: 'reserved',
    reservedBy: data.buyerId,
    reserveExpiresAt: Date.now() + 86400000 * 3
  });

  return {
    ...updatedWorkState,
    orders: [...updatedWorkState.orders, newOrder]
  };
}

export function updateOrderStatus(
  state: ConsignmentMarketState,
  orderId: string,
  status: TradeOrderStatus,
  extra?: { cancelReason?: string }
): ConsignmentMarketState {
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return state;

  const updates: Partial<TradeOrder> = {
    status,
    updatedAt: Date.now()
  };

  if (status === 'paid') updates.paidAt = Date.now();
  if (status === 'delivered') updates.deliveredAt = Date.now();
  if (status === 'completed') updates.completedAt = Date.now();
  if (status === 'cancelled') {
    updates.cancelledAt = Date.now();
    updates.cancelReason = extra?.cancelReason;
  }
  if (status === 'refunded') updates.cancelledAt = Date.now();

  let newState = {
    ...state,
    orders: state.orders.map(o =>
      o.id === orderId ? { ...o, ...updates } : o
    )
  };

  if (status === 'completed') {
    const certificate = generateCertificate(newState, order);
    newState = {
      ...newState,
      certificates: [...newState.certificates, certificate],
      works: newState.works.map(w =>
        w.id === order.workId
          ? { ...w, status: 'sold', soldAt: Date.now(), buyerId: order.buyerId }
          : w
      )
    };

    newState = updateArtistStats(newState, order.sellerId);
    newState = updateBuyerStats(newState, order.buyerId, order.totalAmount);
  }

  if (status === 'cancelled' || status === 'refunded') {
    newState = {
      ...newState,
      works: newState.works.map(w =>
        w.id === order.workId
          ? { ...w, status: 'listed', reservedBy: undefined, reserveExpiresAt: undefined }
          : w
      )
    };
  }

  return newState;
}

function generateCertificate(state: ConsignmentMarketState, order: TradeOrder): DigitalCertificate {
  const work = state.works.find(w => w.id === order.workId);
  
  return {
    id: generateId(),
    certificateNumber: generateCertificateNumber(),
    type: work && work.totalEditions > 1 ? 'limited_edition' : 'authenticity',
    workId: order.workId,
    workTitle: order.workTitle,
    workNumber: order.workNumber,
    artistId: order.sellerId,
    artistName: order.sellerName,
    ownerId: order.buyerId,
    ownerName: order.buyerName,
    editionNumber: work?.edition || 1,
    totalEditions: work?.totalEditions || 1,
    issueDate: Date.now(),
    verificationCode: generateVerificationCode(),
    verified: true
  };
}

function updateArtistStats(state: ConsignmentMarketState, artistId: string): ConsignmentMarketState {
  const artistWorks = state.works.filter(w => w.artistId === artistId && w.status === 'sold');
  const totalSales = artistWorks.length;
  const totalRevenue = artistWorks.reduce((sum, w) => sum + w.price, 0);

  return {
    ...state,
    artists: state.artists.map(a =>
      a.id === artistId
        ? { ...a, totalWorks: state.works.filter(w => w.artistId === artistId).length, totalSales }
        : a
    )
  };
}

function updateBuyerStats(state: ConsignmentMarketState, buyerId: string, amount: number): ConsignmentMarketState {
  return {
    ...state,
    buyers: state.buyers.map(b =>
      b.id === buyerId
        ? { ...b, totalPurchases: b.totalPurchases + 1, totalSpent: b.totalSpent + amount }
        : b
    )
  };
}

export function verifyCertificate(
  state: ConsignmentMarketState,
  certificateId: string
): ConsignmentMarketState {
  return {
    ...state,
    certificates: state.certificates.map(c =>
      c.id === certificateId ? { ...c, verified: true } : c
    )
  };
}

export function transferCertificate(
  state: ConsignmentMarketState,
  certificateId: string,
  newOwnerId: string,
  newOwnerName: string
): ConsignmentMarketState {
  const certificate = state.certificates.find(c => c.id === certificateId);
  if (!certificate) return state;

  const previousOwners = [
    ...(certificate.previousOwners || []),
    {
      ownerId: certificate.ownerId,
      ownerName: certificate.ownerName,
      transferredAt: Date.now()
    }
  ];

  return {
    ...state,
    certificates: state.certificates.map(c =>
      c.id === certificateId
        ? { ...c, ownerId: newOwnerId, ownerName: newOwnerName, previousOwners }
        : c
    )
  };
}

export function filterWorks(
  works: ConsignmentWork[],
  filter: ConsignmentMarketFilter
): ConsignmentWork[] {
  let filtered = [...works];

  if (filter.searchKeyword) {
    const keyword = filter.searchKeyword.toLowerCase();
    filtered = filtered.filter(w =>
      w.title.toLowerCase().includes(keyword) ||
      w.artistName.toLowerCase().includes(keyword) ||
      w.description.toLowerCase().includes(keyword) ||
      w.tags.some(t => t.toLowerCase().includes(keyword))
    );
  }

  if (filter.artistIds.length > 0) {
    filtered = filtered.filter(w => filter.artistIds.includes(w.artistId));
  }

  if (filter.categories.length > 0) {
    filtered = filtered.filter(w => w.category && filter.categories.includes(w.category));
  }

  if (filter.priceMin !== undefined) {
    filtered = filtered.filter(w => w.price >= filter.priceMin!);
  }

  if (filter.priceMax !== undefined) {
    filtered = filtered.filter(w => w.price <= filter.priceMax!);
  }

  if (filter.statuses.length > 0) {
    filtered = filtered.filter(w => filter.statuses.includes(w.status));
  }

  if (filter.onlyAvailable) {
    filtered = filtered.filter(w => w.status === 'listed');
  }

  if (filter.onlyVerifiedArtists) {
    filtered = filtered.filter(w => {
      const artist = works.find(ww => ww.artistId === w.artistId);
      return artist !== undefined;
    });
  }

  switch (filter.sortBy) {
    case 'price_asc':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'date_desc':
      filtered.sort((a, b) => (b.listedAt || 0) - (a.listedAt || 0));
      break;
    case 'date_asc':
      filtered.sort((a, b) => (a.listedAt || 0) - (b.listedAt || 0));
      break;
    case 'popular':
      filtered.sort((a, b) => (b.soldAt ? 1 : 0) - (a.soldAt ? 1 : 0));
      break;
  }

  return filtered;
}

export function calculateMarketStatistics(
  state: ConsignmentMarketState
): ConsignmentMarketStatistics {
  const listedWorks = state.works.filter(w => w.status === 'listed');
  const soldWorks = state.works.filter(w => w.status === 'sold');
  const totalSalesAmount = soldWorks.reduce((sum, w) => sum + w.price, 0);
  
  const myWorks = state.works.filter(w => w.artistId === state.currentUserId);
  const myListedWorks = myWorks.filter(w => w.status === 'listed');
  const mySoldWorks = myWorks.filter(w => w.status === 'sold');
  const myTotalEarnings = mySoldWorks.reduce((sum, w) => sum + w.price, 0);
  
  const myOrders = state.orders.filter(
    o => o.buyerId === state.currentUserId || o.sellerId === state.currentUserId
  );
  const myPendingOrders = myOrders.filter(
    o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'paid'
  );

  const artistSalesMap = new Map<string, { sales: number; revenue: number; name: string }>();
  soldWorks.forEach(work => {
    const current = artistSalesMap.get(work.artistId) || { sales: 0, revenue: 0, name: work.artistName };
    current.sales++;
    current.revenue += work.price;
    artistSalesMap.set(work.artistId, current);
  });

  const topSellingArtists = Array.from(artistSalesMap.entries())
    .map(([artistId, data]) => ({
      artistId,
      artistName: data.name,
      sales: data.sales,
      revenue: data.revenue
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  const averagePrice = listedWorks.length > 0
    ? Math.round(totalSalesAmount / soldWorks.length)
    : 0;

  return {
    totalListedWorks: listedWorks.length,
    totalSoldWorks: soldWorks.length,
    totalSalesAmount,
    myListedWorks: myListedWorks.length,
    mySoldWorks: mySoldWorks.length,
    myTotalEarnings,
    myPendingOrders: myPendingOrders.length,
    activeBuyers: state.buyers.length,
    averagePrice,
    topSellingArtists
  };
}

export function getArtistById(state: ConsignmentMarketState, artistId: string): ArtistInfo | undefined {
  return state.artists.find(a => a.id === artistId);
}

export function getWorkById(state: ConsignmentMarketState, workId: string): ConsignmentWork | undefined {
  return state.works.find(w => w.id === workId);
}

export function getOrderById(state: ConsignmentMarketState, orderId: string): TradeOrder | undefined {
  return state.orders.find(o => o.id === orderId);
}

export function getCertificateById(state: ConsignmentMarketState, certificateId: string): DigitalCertificate | undefined {
  return state.certificates.find(c => c.id === certificateId);
}

export function getMyWorks(state: ConsignmentMarketState): ConsignmentWork[] {
  return state.works.filter(w => w.artistId === state.currentUserId);
}

export function getMyOrders(state: ConsignmentMarketState): TradeOrder[] {
  return state.orders.filter(
    o => o.buyerId === state.currentUserId || o.sellerId === state.currentUserId
  );
}

export function getMyCertificates(state: ConsignmentMarketState): DigitalCertificate[] {
  return state.certificates.filter(c => c.ownerId === state.currentUserId);
}

export function setActiveTab(state: ConsignmentMarketState, tab: ConsignmentMarketTab): ConsignmentMarketState {
  return { ...state, activeTab: tab };
}

export function setFilter(state: ConsignmentMarketState, filter: Partial<ConsignmentMarketFilter>): ConsignmentMarketState {
  return { ...state, filter: { ...state.filter, ...filter } };
}

export function toggleFavoriteWork(state: ConsignmentMarketState, workId: string): ConsignmentMarketState {
  const buyer = state.buyers.find(b => b.id === state.currentUserId);
  if (!buyer) return state;

  const isFavorite = buyer.favoriteWorkIds.includes(workId);
  const newFavoriteIds = isFavorite
    ? buyer.favoriteWorkIds.filter(id => id !== workId)
    : [...buyer.favoriteWorkIds, workId];

  return {
    ...state,
    buyers: state.buyers.map(b =>
      b.id === state.currentUserId ? { ...b, favoriteWorkIds: newFavoriteIds } : b
    )
  };
}

export function switchCurrentUser(
  state: ConsignmentMarketState,
  userId: string,
  userType: 'artist' | 'buyer' | 'both'
): ConsignmentMarketState {
  return {
    ...state,
    currentUserId: userId,
    currentUserType: userType
  };
}

export function getCurrentBuyer(state: ConsignmentMarketState): BuyerInfo | undefined {
  return state.buyers.find(b => b.id === state.currentUserId);
}

export function getCurrentArtist(state: ConsignmentMarketState): ArtistInfo | undefined {
  return state.artists.find(a => a.id === state.currentUserId);
}

export function getCurrentUserName(state: ConsignmentMarketState): string {
  const artist = getCurrentArtist(state);
  if (artist) return artist.name;
  const buyer = getCurrentBuyer(state);
  if (buyer) return buyer.name;
  return '未知用户';
}
