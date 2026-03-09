/**
 * EDVC - Embroidery Design Viewer and Converter
 * 刺绣设计查看器和转换器
 * 
 * 前端应用主文件
 */

class EDVCApp {
    constructor() {
        this.translations = {};
        this.currentLang = 'zh';
        this.fileInfo = null;
        this.elements = [];
        this.stitchList = [];
        this.descriptions = [];
        
        this.canvas = null;
        this.ctx = null;
        this.minimapCanvas = null;
        this.minimapCtx = null;
        
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        this.showMinimap = true;
        this.showDescription = true;
        this.showStitchList = true;
        
        this.selectedElementId = null;
        this.selectedDescriptionId = null;
        this.selectedStitchId = null;
        this.selectedTextId = null;
        
        this.backgroundImage = null;
        this.backgroundImg = null;
        this.canvasTexts = [];
        
        this.isDraggingText = false;
        this.dragTextStartX = 0;
        this.dragTextStartY = 0;
        
        this.threadColors = [];
        
        this.animationRunning = false;
        this.animationPaused = false;
        this.animationIndex = 0;
        this.animationSpeed = 50;
        this.animationTimer = null;
        this.allStitchPoints = [];
        
        this.hasRandomizedColors = false;
        this.originalColors = [];
        
        this.init();
    }
    
    async init() {
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        await this.loadLanguage();
        await this.loadThreadColors();
        await this.loadContactInfo();
        this.setupCanvas();
        this.bindEvents();
        this.render();
        
        this.updateStatus(this.t('msg.no_file'));
        
        this.showWelcomeDialog();
    }
    
    async loadLanguage() {
        try {
            const response = await fetch('/api/language');
            const data = await response.json();
            if (data.success) {
                this.currentLang = data.language;
                this.translations = data.translations;
                this.updateUI();
            }
        } catch (e) {
            console.error('Failed to load language:', e);
        }
    }
    
    async loadThreadColors() {
        try {
            const response = await fetch('/static/data/thread_colors.json');
            if (response.ok) {
                this.threadColors = await response.json();
            }
        } catch (e) {
            console.error('Failed to load thread colors:', e);
        }
    }
    
    async loadContactInfo() {
        try {
            const response = await fetch('/static/data/contact_info.json');
            if (response.ok) {
                this.contactInfo = await response.json();
            }
        } catch (e) {
            console.error('Failed to load contact info:', e);
        }
    }
    
    t(key) {
        return this.translations[key] || key;
    }
    
    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });
        
        // Update placeholders
        document.querySelectorAll('[data-placeholder-i18n]').forEach(el => {
            const key = el.getAttribute('data-placeholder-i18n');
            el.placeholder = this.t(key);
        });
        
        // Update titles
        document.querySelectorAll('[data-title-i18n]').forEach(el => {
            const key = el.getAttribute('data-title-i18n');
            el.title = this.t(key);
        });
        
        document.getElementById('app-title').textContent = 'EDVC - ' + this.t('app.title');
        document.getElementById('language-select').value = this.currentLang;
    }
    
    setupCanvas() {
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        this.minimapCanvas.width = 180;
        this.minimapCanvas.height = 140;
        
        this.drawEmptyCanvas();
    }
    
    drawEmptyCanvas() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.backgroundImage) {
            this.drawBackgroundImage();
        }
        
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        const gridSize = 20;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        if (!this.elements || this.elements.length === 0) {
            this.ctx.fillStyle = '#999';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.t('msg.no_file'), this.canvas.width / 2, this.canvas.height / 2);
        }
    }
    
    drawBackgroundImage() {
        if (!this.backgroundImage || !this.backgroundImg) return;
        
        this.ctx.globalAlpha = this.backgroundImage.opacity || 0.5;
        
        // 计算图片和画布的宽高比
        const imgRatio = this.backgroundImg.width / this.backgroundImg.height;
        const canvasRatio = this.canvas.width / this.canvas.height;
        
        let drawWidth, drawHeight, x, y;
        
        // 根据比例关系确定缩放方式
        if (canvasRatio > imgRatio) {
            // 画布更宽，以高度为基准缩放
            drawHeight = this.canvas.height;
            drawWidth = drawHeight * imgRatio;
            x = (this.canvas.width - drawWidth) / 2;
            y = 0;
        } else {
            // 画布更高，以宽度为基准缩放
            drawWidth = this.canvas.width;
            drawHeight = drawWidth / imgRatio;
            x = 0;
            y = (this.canvas.height - drawHeight) / 2;
        }
        
        // 绘制图片，保持比例并居中
        this.ctx.drawImage(this.backgroundImg, x, y, drawWidth, drawHeight);
        this.ctx.globalAlpha = 1;
    }
    
    loadBackgroundImage() {
        if (!this.backgroundImage) return;
        
        const img = new Image();
        img.onload = () => {
            this.backgroundImg = img;
            this.render();
        };
        
        // 检查是否是SVG文件
        const isSVG = this.backgroundImage.filename && 
                      this.backgroundImage.filename.toLowerCase().endsWith('.svg');
        
        if (isSVG && this.backgroundImage.data) {
            // 对于SVG文件，使用data URL格式
            img.src = 'data:image/svg+xml;base64,' + this.backgroundImage.data;
        } else {
            img.src = this.backgroundImage.data || this.backgroundImage.path;
        }
    }
    
    bindEvents() {
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.render();
        });
        
        document.getElementById('language-select').addEventListener('change', async (e) => {
            await this.setLanguage(e.target.value);
        });
        
        document.getElementById('btn-zoom-in').addEventListener('click', () => this.zoomIn());
        document.getElementById('btn-zoom-out').addEventListener('click', () => this.zoomOut());
        document.getElementById('btn-zoom-fit').addEventListener('click', () => this.zoomFit());
        document.getElementById('btn-zoom-100').addEventListener('click', () => this.zoom100());
        
        // Main buttons event listeners
        document.getElementById('btn-open').addEventListener('click', () => this.openFile());
        document.getElementById('btn-add-background').addEventListener('click', () => this.openBackgroundImage());
        document.getElementById('btn-export').addEventListener('click', () => this.exportCanvas());
        document.getElementById('btn-convert').addEventListener('click', () => this.showFormatConversionDialog());
        document.getElementById('btn-contact').addEventListener('click', () => this.showContactDialog());
        
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('background-input')?.addEventListener('change', (e) => this.handleBackgroundSelect(e));
        
        document.getElementById('btn-add-description')?.addEventListener('click', () => this.addDescription());
        document.getElementById('btn-add-text-to-canvas')?.addEventListener('click', () => this.addTextToCanvas());
        document.getElementById('btn-update-text')?.addEventListener('click', () => this.updateSelectedText());
        document.getElementById('btn-insert-all-stitches')?.addEventListener('click', () => this.insertAllStitchesToDescription());
        document.getElementById('btn-add-info-to-text')?.addEventListener('click', () => this.addInfoToText());
        
        const updateTextBtn = document.getElementById('btn-update-text');
        if (updateTextBtn) {
            updateTextBtn.addEventListener('click', () => this.updateSelectedText());
        }
        
        document.getElementById('btn-animation')?.addEventListener('click', () => this.toggleAnimationControls());
        document.getElementById('btn-random-color')?.addEventListener('click', () => this.randomizeColors());
        document.getElementById('btn-play')?.addEventListener('click', () => this.playAnimation());
        document.getElementById('btn-pause')?.addEventListener('click', () => this.pauseAnimation());
        document.getElementById('btn-reset')?.addEventListener('click', () => this.resetAnimation());
        
        const speedSlider = document.getElementById('animation-speed');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                this.animationSpeed = parseInt(e.target.value);
                document.getElementById('speed-value').textContent = this.animationSpeed;
            });
        }
        
        this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onCanvasWheel(e));
        
        const minimapContainer = document.getElementById('minimap-container');
        minimapContainer.addEventListener('mousedown', (e) => this.onMinimapMouseDown(e));
        
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }
    
    async setLanguage(lang) {
        try {
            const response = await fetch('/api/language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: lang })
            });
            const data = await response.json();
            if (data.success) {
                this.currentLang = data.language;
                this.translations = data.translations;
                this.updateUI();
            }
        } catch (e) {
            console.error('Failed to set language:', e);
        }
    }
    
    openFile() {
        document.getElementById('file-input').click();
    }
    
    openBackgroundImage() {
        let input = document.getElementById('background-input');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.id = 'background-input';
            input.accept = 'image/*,.svg';
            input.style.display = 'none';
            document.body.appendChild(input);
            input.addEventListener('change', (e) => this.handleBackgroundSelect(e));
        }
        input.click();
    }
    
    async handleBackgroundSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('opacity', '0.5');
        
        try {
            const response = await fetch('/api/background', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.success) {
                this.backgroundImage = data.background;
                this.loadBackgroundImage();
                this.updateStatus('Background image loaded');
            } else {
                this.updateStatus('Failed to load background: ' + data.error);
            }
        } catch (e) {
            console.error('Failed to upload background:', e);
        }
        
        e.target.value = '';
    }
    
    async clearBackgroundImage() {
        try {
            await fetch('/api/background', { method: 'DELETE' });
            this.backgroundImage = null;
            this.backgroundImg = null;
            this.render();
            this.updateStatus('Background cleared');
        } catch (e) {
            console.error('Failed to clear background:', e);
        }
    }
    
    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            this.updateStatus(this.t('msg.open_success') + '...');
            
            const response = await fetch('/api/open', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.success) {
                this.fileInfo = data.file_info;
                this.elements = data.elements;
                this.stitchList = data.stitch_list;
                
                this.hasRandomizedColors = false;
                this.originalColors = this.stitchList.map(s => ({ id: s.id, color: s.color }));
                
                this.updateFileInfo();
                this.updateStitchList();
                this.zoomFit();
                this.render();
                
                this.updateStatus(this.t('msg.open_success') + ': ' + file.name);
            } else {
                this.updateStatus(this.t('msg.open_failed') + ': ' + data.error);
            }
        } catch (e) {
            console.error('Failed to open file:', e);
            this.updateStatus(this.t('msg.open_failed') + ': ' + e.message);
        }
        
        e.target.value = '';
    }
    
    updateFileInfo() {
        if (!this.fileInfo) return;
        
        document.getElementById('info-filename').textContent = this.fileInfo.filename || '-';
        document.getElementById('info-format').textContent = this.fileInfo.format || '-';
        document.getElementById('info-size').textContent = 
            `${Math.round(this.fileInfo.width)} x ${Math.round(this.fileInfo.height)}`;
        document.getElementById('info-stitches').textContent = this.fileInfo.stitches || 0;
        document.getElementById('info-colors').textContent = this.fileInfo.colors || 0;
        document.getElementById('info-last-modified').textContent = this.fileInfo.last_modified || '-';
        document.getElementById('info-file-size').textContent = this.fileInfo.file_size || '-';
    }
    
    updateElementList() {
        const container = document.getElementById('element-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.elements.forEach((elem, index) => {
            const item = document.createElement('div');
            item.className = 'item' + (this.selectedElementId === elem.id ? ' selected' : '');
            item.innerHTML = `
                <div class="item-color" style="background: ${elem.stroke || '#000'}"></div>
                <div class="item-info">
                    <div class="item-name">${elem.name || 'Element ' + (index + 1)}</div>
                    <div class="item-detail">${elem.points.length} points</div>
                </div>
            `;
            item.addEventListener('click', () => this.selectElement(elem.id));
            container.appendChild(item);
        });
    }
    
    updateStitchList() {
        const container = document.getElementById('stitch-list');
        container.innerHTML = '';
        
        this.stitchList.forEach((stitch) => {
            const item = document.createElement('div');
            item.className = 'item' + (this.selectedStitchId === stitch.id ? ' selected' : '');
            item.dataset.id = stitch.id;
            item.innerHTML = `
                <div class="item-color clickable" style="background: ${stitch.color}" title="点击选择线色"></div>
                <div class="item-info">
                    <div class="item-name editable" data-field="name">${stitch.name}</div>
                    <div class="item-detail">${stitch.stitch_count} stitches</div>
                </div>
                <button class="insert-btn" data-id="${stitch.id}" title="插入到描述文本">↓</button>
            `;
            
            item.querySelector('.item-color').addEventListener('click', (e) => {
                e.stopPropagation();
                this.showColorPicker(stitch.id, stitch.color);
            });
            
            item.querySelector('.editable').addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.editStitchName(stitch.id, e.target);
            });
            
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('insert-btn') && 
                    !e.target.classList.contains('item-color') &&
                    !e.target.classList.contains('editable')) {
                    this.selectStitchBlock(stitch.id);
                }
            });
            
            container.appendChild(item);
        });
        
        container.querySelectorAll('.insert-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.insertSingleStitchToDescription(parseInt(btn.dataset.id));
            });
        });
    }
    
    showColorPicker(stitchId, currentColor) {
        const stitch = this.stitchList.find(s => s.id === stitchId);
        if (!stitch) return;
        
        let colorOptions = '';
        if (this.threadColors && this.threadColors.length > 0) {
            this.threadColors.forEach(brand => {
                colorOptions += `<optgroup label="${brand.brand}">`;
                brand.colors.forEach(c => {
                    const selected = c.hex.toLowerCase() === currentColor.toLowerCase() ? 'selected' : '';
                    colorOptions += `<option value="${c.hex}" ${selected} style="color: ${c.hex}">${c.name} (${c.id})</option>`;
                });
                colorOptions += '</optgroup>';
            });
        }
        
        this.showModal('选择线色', `
            <div class="color-picker-content">
                <div class="current-color" style="margin-bottom: 15px;">
                    <span>当前颜色: </span>
                    <span class="color-preview" style="display: inline-block; width: 30px; height: 20px; background: ${currentColor}; vertical-align: middle; border: 1px solid #ccc;"></span>
                    <span>${currentColor}</span>
                </div>
                <div class="color-input-group" style="margin-bottom: 15px;">
                    <label>自定义颜色: </label>
                    <input type="color" id="custom-color-input" value="${currentColor}" style="width: 60px; height: 30px;">
                    <input type="text" id="custom-color-text" value="${currentColor}" style="width: 80px;">
                </div>
                ${colorOptions ? `
                <div class="thread-library">
                    <label>线色库: </label>
                    <select id="thread-color-select" style="width: 200px; max-height: 200px;">
                        <option value="">-- 选择线色 --</option>
                        ${colorOptions}
                    </select>
                </div>
                ` : ''}
            </div>
        `);
        
        const customColorInput = document.getElementById('custom-color-input');
        const customColorText = document.getElementById('custom-color-text');
        const threadColorSelect = document.getElementById('thread-color-select');
        
        if (customColorInput && customColorText) {
            customColorInput.addEventListener('input', (e) => {
                customColorText.value = e.target.value;
            });
            customColorText.addEventListener('change', (e) => {
                customColorInput.value = e.target.value;
            });
        }
        
        if (threadColorSelect) {
            threadColorSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    customColorInput.value = e.target.value;
                    customColorText.value = e.target.value;
                }
            });
        }
        
        document.getElementById('modal-confirm').onclick = () => {
            const newColor = customColorInput.value;
            this.updateStitchColor(stitchId, newColor);
            this.hideModal();
        };
    }
    
    updateStitchColor(stitchId, newColor) {
        const stitch = this.stitchList.find(s => s.id === stitchId);
        if (stitch) {
            stitch.color = newColor;
            
            const elem = this.elements.find(e => e.id === stitchId);
            if (elem) {
                elem.stroke = newColor;
            }
            
            this.updateStitchList();
            this.updateElementList();
            this.render();
            this.updateStatus(`颜色已更新: ${newColor}`);
        }
    }
    
    editStitchName(stitchId, element) {
        const stitch = this.stitchList.find(s => s.id === stitchId);
        if (!stitch) return;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = stitch.name;
        input.className = 'inline-edit-input';
        input.style.cssText = 'width: 100%; border: 1px solid #3366cc; padding: 2px 4px; font-size: 12px;';
        
        element.style.display = 'none';
        element.parentNode.insertBefore(input, element);
        input.focus();
        input.select();
        
        const saveName = () => {
            stitch.name = input.value || stitch.name;
            element.textContent = stitch.name;
            element.style.display = '';
            input.remove();
            this.updateStitchList();
        };
        
        input.addEventListener('blur', saveName);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveName();
            } else if (e.key === 'Escape') {
                element.style.display = '';
                input.remove();
            }
        });
    }
    
    selectElement(id) {
        this.selectedElementId = id;
        this.selectedStitchId = id;
        if (document.getElementById('element-list')) {
            this.updateElementList();
        }
        this.updateStitchList();
        this.render();
    }
    
    selectStitchBlock(id) {
        this.selectedStitchId = id;
        this.selectedElementId = id;
        this.updateStitchList();
        if (document.getElementById('element-list')) {
            this.updateElementList();
        }
        this.render();
        
        const block = this.stitchList.find(s => s.id === id);
        if (block) {
            this.updateStatus(`已选择: ${block.name} - ${block.stitch_count} 针`);
        }
    }
    
    render() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.backgroundImage) {
            this.drawBackgroundImage();
        }
        
        if (this.elements && this.elements.length > 0) {
            this.ctx.save();
            this.ctx.translate(this.panX, this.panY);
            this.ctx.scale(this.zoom, this.zoom);
            
            this.elements.forEach(elem => {
                if (!elem.visible) return;
                
                const isSelected = this.selectedElementId === elem.id || this.selectedStitchId === elem.id;
                
                if (isSelected) {
                    this.ctx.strokeStyle = '#ff6600';
                    this.ctx.lineWidth = 3 / this.zoom;
                } else {
                    this.ctx.strokeStyle = elem.stroke || '#000000';
                    this.ctx.lineWidth = (elem.strokeWidth || 1) / this.zoom;
                }
                
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                
                if (elem.points && elem.points.length >= 2) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(elem.points[0].x, elem.points[0].y);
                    
                    for (let i = 1; i < elem.points.length; i++) {
                        this.ctx.lineTo(elem.points[i].x, elem.points[i].y);
                    }
                    
                    this.ctx.stroke();
                }
                
                if (isSelected) {
                    this.drawSelectionBox(elem);
                }
            });
            
            this.ctx.restore();
        }
        
        this.canvasTexts.forEach(textItem => {
            if (!textItem.visible) return;
            
            const lines = textItem.text.split('\n');
            this.ctx.font = `${textItem.fontSize}px ${textItem.fontFamily}`;
            this.ctx.fillStyle = textItem.color;
            this.ctx.textBaseline = 'top';
            
            lines.forEach((line, index) => {
                this.ctx.fillText(line, textItem.x, textItem.y + index * textItem.fontSize * 1.2);
            });
        });
        
        this.drawMinimap();
        this.updateZoomDisplay();
    }
    
    drawSelectionBox(elem) {
        if (!elem.points || elem.points.length === 0) return;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        elem.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        
        const padding = 10;
        this.ctx.strokeStyle = '#3366cc';
        this.ctx.lineWidth = 2 / this.zoom;
        this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
        this.ctx.strokeRect(
            minX - padding,
            minY - padding,
            maxX - minX + padding * 2,
            maxY - minY + padding * 2
        );
        this.ctx.setLineDash([]);
    }
    
    drawMinimap() {
        const ctx = this.minimapCtx;
        const canvas = this.minimapCanvas;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!this.elements || this.elements.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.elements.forEach(elem => {
            if (elem.points) {
                elem.points.forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });
            }
        });
        
        const contentWidth = maxX - minX || 1;
        const contentHeight = maxY - minY || 1;
        const scale = Math.min(
            (canvas.width - 10) / contentWidth,
            (canvas.height - 10) / contentHeight
        );
        
        const offsetX = (canvas.width - contentWidth * scale) / 2 - minX * scale;
        const offsetY = (canvas.height - contentHeight * scale) / 2 - minY * scale;
        
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        
        this.elements.forEach(elem => {
            if (!elem.visible || !elem.points || elem.points.length < 2) return;
            
            const isSelected = this.selectedElementId === elem.id || this.selectedStitchId === elem.id;
            
            if (isSelected) {
                ctx.strokeStyle = '#ff6600';
                ctx.lineWidth = 3 / scale;
            } else {
                ctx.strokeStyle = elem.stroke || '#000000';
                ctx.lineWidth = 1 / scale;
            }
            
            ctx.beginPath();
            ctx.moveTo(elem.points[0].x, elem.points[0].y);
            for (let i = 1; i < elem.points.length; i++) {
                ctx.lineTo(elem.points[i].x, elem.points[i].y);
            }
            ctx.stroke();
        });
        
        ctx.restore();
        
        const viewport = document.getElementById('minimap-viewport');
        const viewWidth = this.canvas.width / this.zoom;
        const viewHeight = this.canvas.height / this.zoom;
        const viewX = -this.panX / this.zoom;
        const viewY = -this.panY / this.zoom;
        
        viewport.style.left = (offsetX + viewX * scale) + 'px';
        viewport.style.top = (offsetY + viewY * scale) + 'px';
        viewport.style.width = Math.min(viewWidth * scale, canvas.width) + 'px';
        viewport.style.height = Math.min(viewHeight * scale, canvas.height) + 'px';
    }
    
    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.25, 10);
        this.render();
    }
    
    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.25, 0.1);
        this.render();
    }
    
    zoomFit() {
        if (!this.elements || this.elements.length === 0) return;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.elements.forEach(elem => {
            if (elem.points) {
                elem.points.forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });
            }
        });
        
        const contentWidth = maxX - minX || 1;
        const contentHeight = maxY - minY || 1;
        
        const padding = 50;
        const scaleX = (this.canvas.width - padding * 2) / contentWidth;
        const scaleY = (this.canvas.height - padding * 2) / contentHeight;
        
        this.zoom = Math.min(scaleX, scaleY, 2);
        
        this.panX = (this.canvas.width - contentWidth * this.zoom) / 2 - minX * this.zoom;
        this.panY = (this.canvas.height - contentHeight * this.zoom) / 2 - minY * this.zoom;
        
        this.render();
    }
    
    zoom100() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.render();
    }
    
    updateZoomDisplay() {
        document.getElementById('zoom-level').textContent = Math.round(this.zoom * 100) + '%';
    }
    
    onCanvasMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const clickedText = this.findTextAtPosition(x, y);
        
        if (clickedText) {
            this.selectText(clickedText.id);
            this.isDraggingText = true;
            this.dragTextStartX = x - clickedText.x;
            this.dragTextStartY = y - clickedText.y;
            this.canvas.style.cursor = 'move';
        } else {
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
        }
    }
    
    findTextAtPosition(canvasX, canvasY) {
        for (let i = this.canvasTexts.length - 1; i >= 0; i--) {
            const text = this.canvasTexts[i];
            if (!text.visible) continue;
            
            const lines = text.text.split('\n');
            const lineHeight = text.fontSize * 1.2;
            const textHeight = lines.length * lineHeight;
            
            const maxWidth = Math.max(...lines.map(line => {
                this.ctx.font = `${text.fontSize}px ${text.fontFamily}`;
                return this.ctx.measureText(line).width;
            }));
            
            if (canvasX >= text.x && canvasX <= text.x + maxWidth &&
                canvasY >= text.y && canvasY <= text.y + textHeight) {
                return text;
            }
        }
        return null;
    }
    
    onCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.zoom;
        const y = (e.clientY - rect.top - this.panY) / this.zoom;
        
        document.getElementById('status-coordinates').textContent = 
            `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
        
        if (this.isDraggingText && this.selectedTextId) {
            const text = this.canvasTexts.find(t => t.id === this.selectedTextId);
            if (text) {
                const canvasX = e.clientX - rect.left;
                const canvasY = e.clientY - rect.top;
                text.x = canvasX - this.dragTextStartX;
                text.y = canvasY - this.dragTextStartY;
                this.render();
            }
        } else if (this.isDragging) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            
            this.panX += dx;
            this.panY += dy;
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            this.render();
        }
    }
    
    onCanvasMouseUp(e) {
        if (this.isDraggingText) {
            this.isDraggingText = false;
            this.updateTextList();
        }
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }
    
    onCanvasWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldX = (mouseX - this.panX) / this.zoom;
        const worldY = (mouseY - this.panY) / this.zoom;
        
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(0.1, Math.min(10, this.zoom * factor));
        
        this.panX = mouseX - worldX * this.zoom;
        this.panY = mouseY - worldY * this.zoom;
        
        this.render();
    }
    
    onMinimapMouseDown(e) {
        e.preventDefault();
        
        const minimapCanvas = this.minimapCanvas;
        const rect = minimapCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        this.panFromMinimap(clickX, clickY);
        
        const onMinimapMouseMove = (e) => {
            const rect = minimapCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.panFromMinimap(x, y);
        };
        
        const onMinimapMouseUp = () => {
            document.removeEventListener('mousemove', onMinimapMouseMove);
            document.removeEventListener('mouseup', onMinimapMouseUp);
        };
        
        document.addEventListener('mousemove', onMinimapMouseMove);
        document.addEventListener('mouseup', onMinimapMouseUp);
    }
    
    panFromMinimap(clickX, clickY) {
        if (!this.elements || this.elements.length === 0) return;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.elements.forEach(elem => {
            if (elem.points) {
                elem.points.forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });
            }
        });
        
        const contentWidth = maxX - minX || 1;
        const contentHeight = maxY - minY || 1;
        const canvas = this.minimapCanvas;
        const scale = Math.min(
            (canvas.width - 10) / contentWidth,
            (canvas.height - 10) / contentHeight
        );
        
        const offsetX = (canvas.width - contentWidth * scale) / 2 - minX * scale;
        const offsetY = (canvas.height - contentHeight * scale) / 2 - minY * scale;
        
        const worldX = (clickX - offsetX) / scale;
        const worldY = (clickY - offsetY) / scale;
        
        this.panX = this.canvas.width / 2 - worldX * this.zoom;
        this.panY = this.canvas.height / 2 - worldY * this.zoom;
        
        this.render();
    }
    
    onKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'o':
                    e.preventDefault();
                    this.openFile();
                    break;
                case 's':
                    e.preventDefault();
                    this.saveFile();
                    break;
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 'c':
                    e.preventDefault();
                    this.copy();
                    break;
                case 'v':
                    e.preventDefault();
                    this.paste();
                    break;
            }
        }
    }
    
    async saveFile() {
        if (!this.fileInfo) {
            this.updateStatus(this.t('msg.no_file'));
            return;
        }
        this.updateStatus('Saving...');
    }
    
    async exportCanvas() {
        if (!this.fileInfo) {
            this.updateStatus(this.t('msg.no_file'));
            return;
        }
        
        // 不要强制随机化颜色，使用服务器端分配的颜色
        try {
            const dataUrl = this.canvas.toDataURL('image/png');
            
            const link = document.createElement('a');
            link.download = (this.fileInfo.filename || 'design') + '.png';
            link.href = dataUrl;
            link.click();
            
            this.updateStatus(this.t('msg.export_success'));
        } catch (e) {
            this.updateStatus(this.t('msg.export_failed') + ': ' + e.message);
        }
    }
    
    async convertFormat(format) {
        if (!this.fileInfo) {
            this.updateStatus(this.t('msg.no_file'));
            return;
        }
        
        try {
            this.updateStatus('Converting to ' + format.toUpperCase() + '...');
            
            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format: format })
            });
            const data = await response.json();
            
            if (data.success) {
                window.location.href = data.file_url;
                this.updateStatus(this.t('msg.export_success') + ': ' + data.filename);
            } else {
                this.updateStatus(this.t('msg.export_failed') + ': ' + data.error);
            }
        } catch (e) {
            this.updateStatus(this.t('msg.export_failed') + ': ' + e.message);
        }
    }
    
    undo() {
        this.updateStatus('Undo');
    }
    
    redo() {
        this.updateStatus('Redo');
    }
    
    copy() {
        this.updateStatus('Copy');
    }
    
    paste() {
        this.updateStatus('Paste');
    }
    
    toggleMinimap() {
        this.showMinimap = !this.showMinimap;
        document.getElementById('minimap-container').classList.toggle('hidden', !this.showMinimap);
    }
    
    toggleDescription() {
        this.showDescription = !this.showDescription;
        document.getElementById('description-section').classList.toggle('hidden', !this.showDescription);
    }
    
    toggleStitchList() {
        this.showStitchList = !this.showStitchList;
        document.getElementById('stitch-list-section').classList.toggle('hidden', !this.showStitchList);
    }
    
    async addDescription() {
        const text = document.getElementById('description-text').value;
        if (!text.trim()) return;
        
        const style = {
            fontFamily: document.getElementById('desc-font-family').value,
            fontSize: document.getElementById('desc-font-size').value,
            color: document.getElementById('desc-font-color').value
        };
        
        try {
            const response = await fetch('/api/description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, style })
            });
            const data = await response.json();
            
            if (data.success) {
                this.descriptions.push(data.description);
                this.updateDescriptionList();
                document.getElementById('description-text').value = '';
            }
        } catch (e) {
            console.error('Failed to add description:', e);
        }
    }
    
    addTextToCanvas() {
        const text = document.getElementById('description-text').value;
        if (!text.trim()) return;
        
        const fontFamily = document.getElementById('desc-font-family').value;
        const fontSize = parseInt(document.getElementById('desc-font-size').value);
        const color = document.getElementById('desc-font-color').value;
        
        const textItem = {
            id: this.canvasTexts.length + 1,
            text: text,
            x: 50,
            y: 50 + this.canvasTexts.length * (fontSize + 5),
            fontFamily: fontFamily,
            fontSize: fontSize,
            color: color,
            visible: true
        };
        
        this.canvasTexts.push(textItem);
        this.updateTextList();
        this.render();
        this.updateStatus('文本已添加到画布');
    }
    
    updateTextList() {
        const container = document.getElementById('text-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.canvasTexts.forEach((textItem) => {
            const item = document.createElement('div');
            item.className = 'item' + (this.selectedTextId === textItem.id ? ' selected' : '');
            item.dataset.id = textItem.id;
            
            const preview = textItem.text.substring(0, 20) + (textItem.text.length > 20 ? '...' : '');
            
            item.innerHTML = `
                <div class="item-info">
                    <div class="item-name" style="color: ${textItem.color}">${preview}</div>
                    <div class="item-detail">${textItem.fontSize}px ${textItem.fontFamily}</div>
                </div>
                <button class="delete-btn" data-id="${textItem.id}" title="删除">×</button>
            `;
            
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-btn')) {
                    this.selectText(textItem.id);
                }
            });
            
            container.appendChild(item);
        });
        
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteText(parseInt(btn.dataset.id));
            });
        });
    }
    
    selectText(id) {
        this.selectedTextId = id;
        const textItem = this.canvasTexts.find(t => t.id === id);
        if (textItem) {
            document.getElementById('description-text').value = textItem.text;
            document.getElementById('desc-font-family').value = textItem.fontFamily;
            document.getElementById('desc-font-size').value = textItem.fontSize;
            document.getElementById('desc-font-color').value = textItem.color;
        }
        this.updateTextList();
        this.render();
        this.updateStatus(`已选择文字块 ${id}`);
    }
    
    updateSelectedText() {
        if (!this.selectedTextId) return;
        
        const textItem = this.canvasTexts.find(t => t.id === this.selectedTextId);
        if (textItem) {
            textItem.text = document.getElementById('description-text').value;
            textItem.fontFamily = document.getElementById('desc-font-family').value;
            textItem.fontSize = parseInt(document.getElementById('desc-font-size').value);
            textItem.color = document.getElementById('desc-font-color').value;
            this.updateTextList();
            this.render();
            this.updateStatus('文字块已更新');
        }
    }
    
    deleteText(id) {
        const index = this.canvasTexts.findIndex(t => t.id === id);
        if (index !== -1) {
            this.canvasTexts.splice(index, 1);
            if (this.selectedTextId === id) {
                this.selectedTextId = null;
            }
            this.updateTextList();
            this.render();
            this.updateStatus('文字块已删除');
        }
    }
    
    toggleAnimationControls() {
        const controls = document.getElementById('animation-controls');
        if (controls) {
            controls.classList.toggle('hidden');
        }
    }
    
    randomizeColors() {
        if (!this.stitchList || this.stitchList.length === 0) {
            this.updateStatus('没有针迹数据');
            return;
        }
        
        const colors = [
            '#e60012', '#ff6b00', '#ffd700', '#7cba00', '#00a651',
            '#00b5ad', '#00a0e9', '#0068b7', '#1d2088', '#601986',
            '#9b59b6', '#e91e63', '#f06292', '#ff5722', '#795548',
            '#607d8b', '#8d6e63', '#4caf50', '#2196f3', '#ff9800'
        ];
        
        this.stitchList.forEach((stitch) => {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            stitch.color = randomColor;
            
            const elem = this.elements.find(e => e.id === stitch.id);
            if (elem) {
                elem.stroke = randomColor;
            }
        });
        
        this.hasRandomizedColors = true;
        
        this.updateStitchList();
        this.render();
        this.updateStatus('已随机配色');
    }
    
    prepareAnimationData() {
        this.allStitchPoints = [];
        
        this.elements.forEach(elem => {
            if (elem.points && elem.points.length > 0) {
                elem.points.forEach(p => {
                    this.allStitchPoints.push({
                        x: p.x,
                        y: p.y,
                        color: elem.stroke || '#000000'
                    });
                });
            }
        });
        
        document.getElementById('animation-progress').textContent = 
            `0 / ${this.allStitchPoints.length}`;
    }
    
    playAnimation() {
        if (this.allStitchPoints.length === 0) {
            this.prepareAnimationData();
        }
        
        if (this.allStitchPoints.length === 0) {
            this.updateStatus('没有针迹数据可播放');
            return;
        }
        
        if (this.animationPaused) {
            this.animationPaused = false;
        }
        
        this.animationRunning = true;
        this.runAnimation();
        this.updateStatus('动画播放中...');
    }
    
    pauseAnimation() {
        if (this.animationRunning) {
            this.animationRunning = false;
            this.animationPaused = true;
            if (this.animationTimer) {
                clearTimeout(this.animationTimer);
            }
            this.updateStatus('动画已暂停');
        }
    }
    
    resetAnimation() {
        this.animationRunning = false;
        this.animationPaused = false;
        this.animationIndex = 0;
        
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
        }
        
        document.getElementById('animation-progress').textContent = 
            `0 / ${this.allStitchPoints.length}`;
        
        this.render();
        this.updateStatus('动画已重置');
    }
    
    runAnimation() {
        if (!this.animationRunning || this.animationIndex >= this.allStitchPoints.length) {
            if (this.animationIndex >= this.allStitchPoints.length) {
                this.animationRunning = false;
                this.updateStatus('动画播放完成');
            }
            return;
        }
        
        this.renderAnimationFrame();
        
        this.animationIndex++;
        
        document.getElementById('animation-progress').textContent = 
            `${this.animationIndex} / ${this.allStitchPoints.length}`;
        
        const delay = Math.max(1, 101 - this.animationSpeed);
        this.animationTimer = setTimeout(() => this.runAnimation(), delay);
    }
    
    renderAnimationFrame() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.backgroundImage) {
            this.drawBackgroundImage();
        }
        
        if (this.elements && this.elements.length > 0) {
            this.ctx.save();
            this.ctx.translate(this.panX, this.panY);
            this.ctx.scale(this.zoom, this.zoom);
            
            let pointCount = 0;
            for (let i = 0; i < this.elements.length && pointCount < this.animationIndex; i++) {
                const elem = this.elements[i];
                if (!elem.visible || !elem.points) continue;
                
                this.ctx.strokeStyle = elem.stroke || '#000000';
                this.ctx.lineWidth = (elem.strokeWidth || 1) / this.zoom;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                
                this.ctx.beginPath();
                let started = false;
                
                for (let j = 0; j < elem.points.length && pointCount < this.animationIndex; j++) {
                    if (!started) {
                        this.ctx.moveTo(elem.points[j].x, elem.points[j].y);
                        started = true;
                    } else {
                        this.ctx.lineTo(elem.points[j].x, elem.points[j].y);
                    }
                    pointCount++;
                }
                
                this.ctx.stroke();
            }
            
            if (this.animationIndex > 0 && this.animationIndex <= this.allStitchPoints.length) {
                const lastPoint = this.allStitchPoints[this.animationIndex - 1];
                this.ctx.fillStyle = '#ff0000';
                this.ctx.beginPath();
                this.ctx.arc(lastPoint.x, lastPoint.y, 3 / this.zoom, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        }
        
        this.canvasTexts.forEach(textItem => {
            if (!textItem.visible) return;
            
            const lines = textItem.text.split('\n');
            this.ctx.font = `${textItem.fontSize}px ${textItem.fontFamily}`;
            this.ctx.fillStyle = textItem.color;
            this.ctx.textBaseline = 'top';
            
            lines.forEach((line, index) => {
                this.ctx.fillText(line, textItem.x, textItem.y + index * textItem.fontSize * 1.2);
            });
        });
        
        this.drawMinimap();
    }
    
    addInfoToText() {
        if (!this.fileInfo) return;
        
        const textarea = document.getElementById('description-text');
        let currentText = textarea.value;
        
        if (currentText && !currentText.endsWith('\n')) {
            currentText += '\n';
        }
        
        if (this.currentLang === 'zh') {
            currentText += `=== 文件信息 ===\n`;
            currentText += `文件名: ${this.fileInfo.filename}\n`;
            currentText += `格式: ${this.fileInfo.format}\n`;
            currentText += `尺寸: ${Math.round(this.fileInfo.width)} x ${Math.round(this.fileInfo.height)}\n`;
            currentText += `针数: ${this.fileInfo.stitches}\n`;
            currentText += `颜色数: ${this.fileInfo.colors}\n`;
            currentText += `最后修改日期: ${this.fileInfo.last_modified || '-'}\n`;
            currentText += `文件大小: ${this.fileInfo.file_size || '-'}\n`;
        } else if (this.currentLang === 'en') {
            currentText += `=== File Info ===\n`;
            currentText += `Filename: ${this.fileInfo.filename}\n`;
            currentText += `Format: ${this.fileInfo.format}\n`;
            currentText += `Size: ${Math.round(this.fileInfo.width)} x ${Math.round(this.fileInfo.height)}\n`;
            currentText += `Stitches: ${this.fileInfo.stitches}\n`;
            currentText += `Colors: ${this.fileInfo.colors}\n`;
            currentText += `Last Modified: ${this.fileInfo.last_modified || '-'}\n`;
            currentText += `File Size: ${this.fileInfo.file_size || '-'}\n`;
        } else if (this.currentLang === 'es') {
            currentText += `=== Información del Archivo ===\n`;
            currentText += `Nombre de Archivo: ${this.fileInfo.filename}\n`;
            currentText += `Formato: ${this.fileInfo.format}\n`;
            currentText += `Tamaño: ${Math.round(this.fileInfo.width)} x ${Math.round(this.fileInfo.height)}\n`;
            currentText += `Puntos: ${this.fileInfo.stitches}\n`;
            currentText += `Colores: ${this.fileInfo.colors}\n`;
            currentText += `Última Modificación: ${this.fileInfo.last_modified || '-'}\n`;
            currentText += `Tamaño del Archivo: ${this.fileInfo.file_size || '-'}\n`;
        }
        
        textarea.value = currentText;
        this.updateStatus('文件信息已添加到文本编辑框');
    }
    
    updateDescriptionList() {
        const container = document.getElementById('description-list');
        container.innerHTML = '';
        
        this.descriptions.forEach((desc) => {
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${desc.text.substring(0, 30)}${desc.text.length > 30 ? '...' : ''}</div>
                </div>
            `;
            item.addEventListener('click', () => this.editDescription(desc.id));
            container.appendChild(item);
        });
    }
    
    editDescription(id) {
        const desc = this.descriptions.find(d => d.id === id);
        if (desc) {
            document.getElementById('description-text').value = desc.text;
            this.selectedDescriptionId = id;
        }
    }
    
    insertAllStitchesToDescription() {
        if (!this.stitchList || this.stitchList.length === 0) {
            this.updateStatus('No stitch data available');
            return;
        }
        
        const textarea = document.getElementById('description-text');
        let currentText = textarea.value;
        
        if (currentText && !currentText.endsWith('\n')) {
            currentText += '\n';
        }
        
        if (this.currentLang === 'zh') {
            currentText += '=== 针迹清单 ===\n';
        } else if (this.currentLang === 'en') {
            currentText += '=== Stitch List ===\n';
        } else if (this.currentLang === 'es') {
            currentText += '=== Lista de Puntos ===\n';
        }
        
        this.stitchList.forEach((stitch, index) => {
            currentText += `\n[Block ${index + 1}] ${stitch.name}\n`;
            if (this.currentLang === 'zh') {
                currentText += `  颜色: ${stitch.color}\n`;
                currentText += `  针数: ${stitch.stitch_count}\n`;
            } else if (this.currentLang === 'en') {
                currentText += `  Color: ${stitch.color}\n`;
                currentText += `  Stitches: ${stitch.stitch_count}\n`;
            } else if (this.currentLang === 'es') {
                currentText += `  Color: ${stitch.color}\n`;
                currentText += `  Puntos: ${stitch.stitch_count}\n`;
            }
        });
        
        textarea.value = currentText;
        this.updateStatus(`已插入 ${this.stitchList.length} 个针迹块信息`);
    }
    
    insertSingleStitchToDescription(stitchId) {
        const stitch = this.stitchList.find(s => s.id === stitchId);
        if (!stitch) return;
        
        const textarea = document.getElementById('description-text');
        let currentText = textarea.value;
        
        if (currentText && !currentText.endsWith('\n')) {
            currentText += '\n';
        }
        
        // 按照用户要求的格式插入内容
        if (!currentText.includes('=== 针迹清单 ===')) {
            currentText += '=== 针迹清单 ===\n\n';
        }
        
        if (this.currentLang === 'zh') {
            currentText += `[${stitch.name}] ${stitch.name}\n  颜色: ${stitch.color}\n\n`;
        } else if (this.currentLang === 'en') {
            currentText += `[${stitch.name}] ${stitch.name}\n  Color: ${stitch.color}\n\n`;
        } else if (this.currentLang === 'es') {
            currentText += `[${stitch.name}] ${stitch.name}\n  Color: ${stitch.color}\n\n`;
        }
        
        textarea.value = currentText;
        this.updateStatus(`已插入: ${stitch.name}`);
    }
    
    async showAbout() {
        try {
            const response = await fetch('/api/about');
            const data = await response.json();
            
            if (data.success) {
                const about = data.about;
                this.showModal('About', `
                    <div style="text-align: center;">
                        <h2 style="margin-bottom: 15px;">${about.name}</h2>
                        <p style="margin-bottom: 10px;"><strong>Version:</strong> ${about.version}</p>
                        <p style="margin-bottom: 10px;"><strong>Description:</strong> ${about.description}</p>
                        <p style="margin-bottom: 10px;"><strong>Author:</strong> ${about.author}</p>
                        <p><strong>Email:</strong> ${about.email}</p>
                    </div>
                `);
            }
        } catch (e) {
            console.error('Failed to get about info:', e);
        }
    }
    
    showWelcomeDialog() {
        const content = `
            <div class="welcome-dialog">
                <h2>${this.t('welcome.title')}</h2>
                <p>${this.t('welcome.message')}</p>
                <ul>
                    <li>${this.t('welcome.feature1')}</li>
                    <li>${this.t('welcome.feature2')}</li>
                    <li>${this.t('welcome.feature3')}</li>
                    <li>${this.t('welcome.feature4')}</li>
                    <li>${this.t('welcome.feature5')}</li>
                </ul>
                <p>${this.t('welcome.get_started')}</p>
            </div>
        `;
        this.showModal(this.t('welcome.dialog_title'), content);
    }
    
    showContactDialog() {
        let content = '';
        
        // 从外部JSON文件获取联系信息
        const contactData = this.contactInfo && this.contactInfo[this.currentLang];
        
        if (contactData) {
            content = `
                <div class="contact-dialog">
                    <p>${contactData.message}</p>
                    <div class="contact-info">
                        <p><strong>${this.t('label.email')}：</strong> ${contactData.contact_info.email}</p>
                        <p><strong>${this.t('label.phone')}：</strong> ${contactData.contact_info.phone}</p>
                        <p><strong>${this.t('label.website')}：</strong> <a href="#" onclick="event.preventDefault();">${contactData.contact_info.website}</a></p>
                    </div>
                </div>
            `;
        } else {
            //  fallback to default content
            content = `
                <div class="contact-dialog">
                    <p>${this.t('msg.contact_message')}</p>
                    <div class="contact-info">
                        <p><strong>${this.t('label.email')}：</strong> support@edvc.com</p>
                        <p><strong>${this.t('label.phone')}：</strong> +86 123 4567 8910</p>
                        <p><strong>${this.t('label.website')}：</strong> <a href="#" onclick="event.preventDefault();">www.edvc.com</a></p>
                    </div>
                </div>
            `;
        }
        
        this.showModal(this.t('btn.contact'), content);
    }
    
    showFormatConversionDialog() {
        if (!this.fileInfo) {
            this.updateStatus(this.t('msg.no_file'));
            return;
        }
        
        const formats = [
            { value: 'dst', name: 'DST (Tajima)' },
            { value: 'pes', name: 'PES (Brother)' },
            { value: 'jef', name: 'JEF (Janome)' },
            { value: 'exp', name: 'EXP (Melco)' },
            { value: 'vp3', name: 'VP3 (Pfaff)' },
            { value: 'pec', name: 'PEC (Brother)' },
            { value: 'xxx', name: 'XXX (Singer)' },
            { value: 'sew', name: 'SEW (Janome)' },
            { value: 'dsb', name: 'DSB (Barudan)' },
            { value: 'u01', name: 'U01 (Barudan)' },
            { value: 'tbf', name: 'TBF (Tajima)' }
        ];
        
        let content = '<div class="format-conversion-dialog">';
        content += `<p>${this.t('label.select_target_format')}：</p>`;
        content += '<div class="format-buttons">';
        
        formats.forEach(format => {
            content += `<button class="format-btn" data-format="${format.value}">${format.name}</button>`;
        });
        
        content += '</div>';
        content += '</div>';
        
        this.showModal(this.t('modal.format_conversion'), content);
        
        // Add event listeners to format buttons
        setTimeout(() => {
            document.querySelectorAll('.format-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const format = btn.getAttribute('data-format');
                    this.convertFormat(format);
                    this.hideModal();
                });
            });
        }, 100);
    }
    
    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-content').innerHTML = content;
        document.getElementById('modal-overlay').classList.remove('hidden');
        
        // Update button text based on language
        document.getElementById('modal-cancel').textContent = this.t('btn.cancel');
        document.getElementById('modal-confirm').textContent = this.t('btn.confirm');
        
        document.querySelector('.modal-close').onclick = () => this.hideModal();
        document.getElementById('modal-cancel').onclick = () => this.hideModal();
        document.getElementById('modal-confirm').onclick = () => this.hideModal();
    }
    
    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }
    
    updateStatus(message) {
        document.getElementById('status-message').textContent = message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new EDVCApp();
});
