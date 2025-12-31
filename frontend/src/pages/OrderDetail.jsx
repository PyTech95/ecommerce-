import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersApi,productsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  ArrowLeft, 
  Edit, 
  FileDown, 
  FileText, 
  Eye,
  Share2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// Helper function to format date as DD-MM-YYYY
const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
};

const statusColors = {
  'Draft': 'bg-yellow-100 text-yellow-800',
  'Submitted': 'bg-blue-100 text-blue-800',
  'In Production': 'bg-purple-100 text-purple-800',
  'Done': 'bg-green-100 text-green-800',
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const [orderRes, productsRes] = await Promise.all([
        ordersApi.getById(id),
        productsApi.getAll(),
      ]);
      
      // Auto-fill missing product_image from catalog for existing items
      const orderData = orderRes.data;
      const productsList = productsRes.data;
      
      if (orderData.items && orderData.items.length > 0) {
        orderData.items = orderData.items.map(item => {
          // If item doesn't have product_image, try to get it from catalog
          if (!item.product_image && item.product_code) {
            const catalogProduct = productsList.find(p => p.product_code === item.product_code);
            if (catalogProduct && catalogProduct.image) {
              return { ...item, product_image: catalogProduct.image };
            }
          }
          return item;
        });
      }
      
      setOrder(orderData);
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Failed to load preview');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };


  const handleExportPdf = () => {
    // Generate clean HTML for PDF - same as print
    const logoUrl = "https://customer-assets.emergentagent.com/job_furnipdf-maker/artifacts/mdh71t2g_WhatsApp%20Image%202025-12-22%20at%202.24.36%20PM.jpeg";
    
    // Generate HTML for each item
    const itemsHtml = order.items.map((item, index) => {
      const cbm = item.cbm_auto 
        ? ((item.height_cm || 0) * (item.depth_cm || 0) * (item.width_cm || 0) / 1000000).toFixed(2)
        : item.cbm;
      
      const mainImage = item.product_image || (item.images && item.images.length > 0 ? item.images[0] : null);
      const additionalImages = item.product_image ? (item.images || []) : (item.images || []).slice(1);
      
      // RESPONSIVE SIZING - Calculate based on actual content
      const hasAdditionalImages = additionalImages.length > 0;
      const additionalImageCount = Math.min(additionalImages.length, 4);
      const notesLength = item.notes ? item.notes.length : 0;
      const hasLeather = item.leather_image || item.leather_code;
      const hasFinish = item.finish_image || item.finish_code;
      
      // A4 usable height: ~750px (277mm - header - footer - table)
      // Base allocations
      let mainImageHeight = 340;
      let additionalImageSize = 216;
      let swatchHeight = 100;
      
      // Responsive adjustments based on content density
      if (hasAdditionalImages) {
        // More additional images = smaller sizes
        if (additionalImageCount >= 3) {
          mainImageHeight = 280;
          additionalImageSize = 160;
        } else if (additionalImageCount >= 2) {
          mainImageHeight = 300;
          additionalImageSize = 180;
        } else {
          mainImageHeight = 320;
          additionalImageSize = 200;
        }
        
        // Long notes further reduce image sizes
        if (notesLength > 300) {
          mainImageHeight -= 40;
          additionalImageSize -= 30;
        } else if (notesLength > 150) {
          mainImageHeight -= 20;
          additionalImageSize -= 15;
        }
      } else {
        // No additional images - more space for main image
        if (notesLength > 300) {
          mainImageHeight = 300;
        } else if (notesLength > 150) {
          mainImageHeight = 320;
        }
      }
      
      // Adjust swatch height based on content
      if (hasLeather && hasFinish && hasAdditionalImages) {
        swatchHeight = 80;
      } else if (hasLeather && hasFinish) {
        swatchHeight = 100;
      }
      
      return `
        <div class="page" style="page-break-after: always; padding: 8mm; box-sizing: border-box; height: 277mm; overflow: hidden;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 2px solid #3d2c1e;">
            <img src="${logoUrl}" alt="JAIPUR" style="height: 60px; object-fit: contain;" />
            <table style="border: 1px solid #3d2c1e; border-collapse: collapse; font-size: 10px;">
              <tr style="border-bottom: 1px solid #3d2c1e;">
                <td style="padding: 3px 8px; background: #f5f0eb; font-weight: bold; border-right: 1px solid #3d2c1e;">ENTRY DATE</td>
                <td style="padding: 3px 8px; min-width: 90px;">${formatDateDDMMYYYY(order.entry_date)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #3d2c1e;">
                <td style="padding: 3px 8px; background: #f5f0eb; font-weight: bold; border-right: 1px solid #3d2c1e;">INFORMED TO FACTORY</td>
                <td style="padding: 3px 8px;">${formatDateDDMMYYYY(order.factory_inform_date || order.entry_date)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #3d2c1e;">
                <td style="padding: 3px 8px; background: #f5f0eb; font-weight: bold; border-right: 1px solid #3d2c1e;">FACTORY</td>
                <td style="padding: 3px 8px;">${order.factory || '-'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #3d2c1e;">
                <td style="padding: 3px 8px; background: #f5f0eb; font-weight: bold; border-right: 1px solid #3d2c1e;">SALES ORDER REF</td>
                <td style="padding: 3px 8px; font-family: monospace;">${order.sales_order_ref || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 3px 8px; background: #f5f0eb; font-weight: bold; border-right: 1px solid #3d2c1e;">BUYER PO</td>
                <td style="padding: 3px 8px; font-family: monospace;">${order.buyer_po_ref || '-'}</td>
              </tr>
            </table>
          </div>
          
          <!-- Images Section -->
          <div style="display: flex; gap: 10px; padding: 6px 0;">
            <!-- Main Product Image - 75% -->
            <div style="width: 75%;">
              ${mainImage 
                ? `<div style="border: 1px solid #ddd; border-radius: 4px; padding: 6px; background: white; display: flex; align-items: center; justify-content: center; height: ${mainImageHeight}px;">
                    <img src="${mainImage}" alt="Product" style="max-width: 100%; max-height: ${mainImageHeight - 12}px; object-fit: contain;" />
                  </div>`
                : `<div style="width: 100%; height: ${mainImageHeight}px; display: flex; align-items: center; justify-content: center; background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; color: #888;">No Image Available</div>`
              }
              ${additionalImages.length > 0 ? `
                <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                  ${additionalImages.slice(0, 4).map(img => `
                    <img src="${img}" alt="Additional" style="width: ${additionalImageSize}px; height: ${additionalImageSize}px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; flex-shrink: 0;" />
                  `).join('')}
                  ${additionalImages.length > 4 ? `
                    <div style="width: ${additionalImageSize}px; height: ${additionalImageSize}px; border: 1px solid #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;">+${additionalImages.length - 4} more</div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
            
            <!-- Material Swatches - 25% -->
            <div style="width: 25%; display: flex; flex-direction: column; gap: 6px;">
              ${item.leather_image || item.leather_code ? `
                <div style="border: 1px solid #ddd; border-radius: 4px; padding: 6px; background: #fafafa;">
                  ${item.leather_image 
                    ? `<img src="${item.leather_image}" alt="Leather" style="width: 100%; height: ${swatchHeight}px; object-fit: cover; border-radius: 4px; margin-bottom: 4px;" />`
                    : `<div style="width: 100%; height: ${swatchHeight}px; background: linear-gradient(135deg, #8B4513, #A0522D); border-radius: 4px; margin-bottom: 4px;"></div>`
                  }
                  <p style="font-size: 9px; color: #666; text-align: center; text-transform: uppercase; margin: 0;">Leather</p>
                  <p style="font-size: 10px; font-weight: 600; text-align: center; margin: 0;">${item.leather_code || '-'}</p>
                </div>
              ` : ''}
              ${item.finish_image || item.finish_code ? `
                <div style="border: 1px solid #ddd; border-radius: 4px; padding: 6px; background: #fafafa;">
                  ${item.finish_image 
                    ? `<img src="${item.finish_image}" alt="Finish" style="width: 100%; height: ${swatchHeight}px; object-fit: cover; border-radius: 4px; margin-bottom: 4px;" />`
                    : `<div style="width: 100%; height: ${swatchHeight}px; background: linear-gradient(135deg, #D4A574, #C4956A); border-radius: 4px; margin-bottom: 4px;"></div>`
                  }
                  <p style="font-size: 9px; color: #666; text-align: center; text-transform: uppercase; margin: 0;">Finish</p>
                  <p style="font-size: 10px; font-weight: 600; text-align: center; margin: 0;">${item.finish_code || '-'}</p>
                </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Notes Section -->
          <div style="border: 1px solid #3d2c1e; border-radius: 4px; margin-bottom: 6px; width: 100%;">
            <div style="background: #3d2c1e; color: white; padding: 6px 10px; font-weight: 600; font-size: 12px;">Notes:</div>
            <div style="padding: 8px 10px; font-size: 15px; line-height: 1.4;">
              ${item.notes ? `<div>${item.notes}</div>` : `
                <div style="color: #888;">
                  ${item.category ? `<p style="margin: 2px 0;">• Category: ${item.category}</p>` : ''}
                  ${item.leather_code ? `<p style="margin: 2px 0;">• Leather: ${item.leather_code}</p>` : ''}
                  ${item.finish_code ? `<p style="margin: 2px 0;">• Finish: ${item.finish_code}</p>` : ''}
                  ${item.color_notes ? `<p style="margin: 2px 0;">• Color Notes: ${item.color_notes}</p>` : ''}
                  ${item.wood_finish ? `<p style="margin: 2px 0;">• Wood Finish: ${item.wood_finish}</p>` : ''}
                  ${!item.category && !item.leather_code && !item.finish_code && !item.color_notes && !item.wood_finish ? '<p style="font-style: italic;">No notes added</p>' : ''}
                </div>
              `}
            </div>
          </div>
          
          <!-- Details Table - Compact -->
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 2px solid #3d2c1e;">
            <thead>
              <tr style="background: #3d2c1e; color: white;">
                <th style="padding: 6px; text-align: left; border-right: 1px solid #5a4a3a;" rowspan="2">ITEM CODE</th>
                <th style="padding: 6px; text-align: left; border-right: 1px solid #5a4a3a;" rowspan="2">DESCRIPTION</th>
                <th style="padding: 6px; text-align: center; border-right: 1px solid #5a4a3a;" colspan="3">SIZE (cm)</th>
                <th style="padding: 6px; text-align: center; border-right: 1px solid #5a4a3a;" rowspan="2">CBM</th>
                <th style="padding: 6px; text-align: center;" rowspan="2">Qty</th>
              </tr>
              <tr style="background: #5a4a3a; color: white; font-size: 9px;">
                <th style="padding: 4px; border-right: 1px solid #6a5a4a;">H</th>
                <th style="padding: 4px; border-right: 1px solid #6a5a4a;">D</th>
                <th style="padding: 4px; border-right: 1px solid #6a5a4a;">W</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-top: 1px solid #3d2c1e;">
                <td style="padding: 6px; font-family: monospace; font-weight: bold; border-right: 1px solid #ddd;">${item.product_code || '-'}</td>
                <td style="padding: 6px; border-right: 1px solid #ddd;">${item.description || '-'}${item.color_notes ? ` <span style="color: #666;">(${item.color_notes})</span>` : ''}</td>
                <td style="padding: 6px; text-align: center; border-right: 1px solid #ddd;">${item.height_cm || 0}</td>
                <td style="padding: 6px; text-align: center; border-right: 1px solid #ddd;">${item.depth_cm || 0}</td>
                <td style="padding: 6px; text-align: center; border-right: 1px solid #ddd;">${item.width_cm || 0}</td>
                <td style="padding: 6px; text-align: center; font-family: monospace; border-right: 1px solid #ddd;">${cbm}</td>
                <td style="padding: 6px; text-align: center; font-weight: bold;">${item.quantity || 1} Pcs</td>
              </tr>
            </tbody>
          </table>
          
          <!-- Footer -->
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 6px; border-top: 1px solid #ddd; font-size: 9px; color: #888;">
            <span>Buyer: ${order.buyer_name || '-'} • PO: ${order.buyer_po_ref || '-'}</span>
            <span>Page ${index + 1} of ${order.items.length}</span>
          </div>
        </div>
      `;
    }).join('');

    // Open new window with the PDF-ready HTML
    const pdfWindow = window.open('', '_blank', 'width=800,height=600');
    
    pdfWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Production Sheet - ${order.sales_order_ref || 'Order'}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
          .page:last-child { page-break-after: auto; }
          img { max-width: 100%; }
          /* Notes styling for bullet points and bold text */
          ul { margin: 0; padding-left: 20px; }
          li { margin: 4px 0; }
          p { margin: 4px 0; }
          strong { font-weight: 700; }
        </style>
      </head>
      <body>
        ${itemsHtml}
        <script>
          // Auto-trigger print dialog for "Save as PDF"
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    
    pdfWindow.document.close();
    toast.success('PDF preview opened - Select "Save as PDF" in print dialog');
  };

  const handleWhatsAppShare = async () => {
    setSharing(true);
    try {
      const pdfUrl = ordersApi.exportPdf(id);
      
      let message = `*JAIPUR Production Sheet*\n\n`;
      message += `📋 *Order:* ${order?.sales_order_ref || 'N/A'}\n`;
      message += `👤 *Buyer:* ${order?.buyer_name || 'N/A'}\n`;
      message += `📅 *Date:* ${order?.entry_date || 'N/A'}\n`;
      message += `📦 *Items:* ${order?.items?.length || 0}\n\n`;
      
      if (order?.items?.length > 0) {
        message += `*Items:*\n`;
        order.items.forEach((item, idx) => {
          message += `${idx + 1}. ${item.product_code} - ${item.description || 'No desc'} (Qty: ${item.quantity})\n`;
        });
        message += `\n`;
      }
      
      message += `📥 *Download PDF:*\n${pdfUrl}`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success('Opening WhatsApp...');
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="order-detail-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="empty-state" data-testid="order-not-found">
        <FileText className="empty-state-icon mx-auto" />
        <p>Order not found</p>
        <Link to="/orders">
          <Button variant="outline" className="mt-4">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="order-detail-page">
      {/* Header */}
      <div className="page-header">
        <Button 
          variant="ghost" 
          className="mb-4 gap-2"
          onClick={() => navigate('/orders')}
          data-testid="back-btn"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Back to Orders</span>
        </Button>
        
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="page-title font-mono text-lg sm:text-2xl" data-testid="order-ref">
                {order.sales_order_ref || 'Untitled Order'}
              </h1>
              <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                {order.status}
              </Badge>
            </div>
            <p className="page-description text-sm">
              Buyer: {order.buyer_name || 'N/A'} | PO: {order.buyer_po_ref || 'N/A'}
            </p>
          </div>
          
          {/* Action Buttons - Responsive */}
          <div className="flex flex-wrap gap-2">
            <Link to={`/orders/${id}/preview`} className="flex-1 sm:flex-none">
              <Button variant="outline" className="gap-2 w-full sm:w-auto" data-testid="preview-btn">
                <Eye size={18} />
                <span>Preview</span>
              </Button>
            </Link>
            <Button 
              className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
              onClick={handleWhatsAppShare}
              disabled={sharing}
              data-testid="whatsapp-btn"
            >
              {sharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
              <span>WhatsApp</span>
            </Button>
            <Button 
              variant="outline"
              className="gap-2 flex-1 sm:flex-none"
              onClick={handleExportPdf}
              data-testid="export-pdf-btn"
            >
              <FileDown size={18} />
              <span>PDF</span>
            </Button>
            <Link to={`/orders/${id}/edit`} className="flex-1 sm:flex-none">
              <Button variant="secondary" className="gap-2 w-full sm:w-auto" data-testid="edit-btn">
                <Edit size={18} />
                <span>Edit</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Order Info */}
      <Card className="mb-6" data-testid="order-info-card">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Order Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Entry Date</p>
              <p className="font-medium">{formatDateDDMMYYYY(order.entry_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Factory</p>
              <p className="font-medium">{order.factory || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="font-medium">{order.items?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {formatDateDDMMYYYY(order.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card data-testid="items-card">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(!order.items || order.items.length === 0) ? (
            <div className="empty-state" data-testid="no-items">
              <FileText className="empty-state-icon mx-auto" />
              <p>No items in this order</p>
              <Link to={`/orders/${id}/edit`}>
                <Button variant="outline" className="mt-4">Add Items</Button>
              </Link>
            </div>
          ) : (
            <Table data-testid="items-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">H (cm)</TableHead>
                  <TableHead className="text-center">D (cm)</TableHead>
                  <TableHead className="text-center">W (cm)</TableHead>
                  <TableHead className="text-center">CBM</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead>Images</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => {
                  const cbm = item.cbm_auto 
                    ? ((item.height_cm || 0) * (item.depth_cm || 0) * (item.width_cm || 0) / 1000000).toFixed(4)
                    : item.cbm;
                  
                  return (
                    <TableRow key={item.id || index} data-testid={`item-row-${index}`}>
                      <TableCell className="font-mono font-medium">
                        {item.product_code || '-'}
                      </TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell className="text-center">{item.height_cm || 0}</TableCell>
                      <TableCell className="text-center">{item.depth_cm || 0}</TableCell>
                      <TableCell className="text-center">{item.width_cm || 0}</TableCell>
                      <TableCell className="text-center font-mono">{cbm}</TableCell>
                      <TableCell className="text-center">{item.quantity || 1}</TableCell>
                      <TableCell>
                        {item.images?.length > 0 ? (
                          <span className="text-sm text-muted-foreground">
                            {item.images.length} image(s)
                          </span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
