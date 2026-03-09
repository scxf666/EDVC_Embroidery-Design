"""
EDVC - Embroidery Design Viewer and Converter
刺绣设计查看器和转换器

单文件版本 - Windows平台Demo
支持中文、英文、西班牙语
"""

import os
import sys
import json
import tempfile
import math
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

from flask import Flask, render_template, request, jsonify, send_file

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'embcode2633'))

try:
    from embroidery_studio.core.stitch.export.reader import EmbroideryReader, read_embroidery
    from embroidery_studio.core.stitch.export.writer import EmbroideryWriter
    CORE_AVAILABLE = True
except ImportError:
    CORE_AVAILABLE = False

from pembroider_editor.core import EditorCanvas, EditorElement, EmbroiderySettings, Point, ElementType

app = Flask(__name__, 
            template_folder='templates',
            static_folder='static')

canvas = EditorCanvas(800, 600)

SUPPORTED_FORMATS = ['dst', 'pes', 'jef', 'exp', 'vp3', 'pec', 'xxx', 'sew', 'dsb', 'u01', 'tbf']

LANGUAGE = 'en'

TRANSLATIONS = {
    'zh': {
        'app.title': '刺绣设计查看器和转换器',
        'menu.file': '文件',
        'menu.file.open': '打开',
        'menu.file.save': '保存',
        'menu.file.export_image': '导出图片',
        'menu.edit': '编辑',
        'menu.edit.undo': '撤销',
        'menu.edit.redo': '重做',
        'menu.edit.copy': '复制',
        'menu.edit.paste': '粘贴',
        'menu.view': '视图',
        'menu.view.minimap': '小地图',
        'menu.view.description': '描述信息',
        'menu.view.stitch_list': '针迹清单',
        'menu.format': '格式',
        'menu.format.convert': '转换格式',
        'menu.help': '帮助',
        'menu.help.about': '关于',
        'panel.description': '描述文本',
        'panel.stitch_list': '针迹清单',
        'panel.element_list': '图元列表',
        'panel.properties': '属性',
        'panel.canvas_text': '画布文字',
        'btn.open': '打开文件',
        'btn.save': '保存',
        'btn.export': '导出',
        'btn.zoom_in': '放大',
        'btn.zoom_out': '缩小',
        'btn.zoom_fit': '适应窗口',
        'btn.zoom_100': '实际大小',
        'btn.add_background': '添加背景',
        'btn.convert': '转换格式',
        'btn.contact': '联系',
        'btn.cancel': '取消',
        'btn.confirm': '确定',
        'modal.format_conversion': '格式转换',
        'placeholder.description': '输入描述文本...',
        'label.filename': '文件名',
        'label.size': '尺寸',
        'label.stitches': '针数',
        'label.colors': '颜色数',
        'label.format': '格式',
        'label.last_modified': '最后修改日期',
        'label.file_size': '文件大小',
        'label.playback_speed': '播放速度',
        'label.select_target_format': '选择目标格式',
        'label.email': '电子邮件',
        'label.phone': '电话',
        'label.website': '网站',
        'btn.play': '播放',
        'btn.pause': '暂停',
        'btn.reset': '重置',
        'msg.no_file': '未打开文件',
        'msg.open_success': '文件打开成功',
        'msg.open_failed': '文件打开失败',
        'msg.save_success': '保存成功',
        'msg.save_failed': '保存失败',
        'msg.export_success': '导出成功',
        'msg.export_failed': '导出失败',
        'msg.contact_message': '如果您有任何问题或建议，请通过以下方式联系我们：',
        'welcome.dialog_title': '欢迎使用 EDVC',
        'welcome.title': '刺绣设计查看器和转换器',
        'welcome.message': '欢迎使用 EDVC - 专业的刺绣设计查看和转换工具！',
        'welcome.feature1': '支持多种刺绣文件格式（DST, PES, JEF, EXP, VP3, PEC, XXX, SEW等）',
        'welcome.feature2': '实时预览和编辑刺绣设计',
        'welcome.feature3': '格式转换和图片导出功能',
        'welcome.feature4': '多语言界面支持（中文、英文、西班牙语）',
        'welcome.feature5': '支持添加背景图片（包括SVG矢量图形）',
        'welcome.get_started': '点击"打开"按钮开始使用！',
        'format.dst': 'DST (Tajima)',
        'format.pes': 'PES (Brother)',
        'format.jef': 'JEF (Janome)',
        'format.exp': 'EXP (Melco)',
        'format.vp3': 'VP3 (Pfaff)',
        'format.pec': 'PEC (Brother)',
        'format.xxx': 'XXX (Singer)',
        'format.sew': 'SEW (Janome)',
        'format.dsb': 'DSB (Barudan)',
        'format.u01': 'U01 (Barudan)',
        'format.tbf': 'TBF (Tajima)',
    },
    'en': {
        'app.title': 'Embroidery Design Viewer and Converter',
        'menu.file': 'File',
        'menu.file.open': 'Open',
        'menu.file.save': 'Save',
        'menu.file.export_image': 'Export Image',
        'menu.edit': 'Edit',
        'menu.edit.undo': 'Undo',
        'menu.edit.redo': 'Redo',
        'menu.edit.copy': 'Copy',
        'menu.edit.paste': 'Paste',
        'menu.view': 'View',
        'menu.view.minimap': 'Minimap',
        'menu.view.description': 'Description',
        'menu.view.stitch_list': 'Stitch List',
        'menu.format': 'Format',
        'menu.format.convert': 'Convert Format',
        'menu.help': 'Help',
        'menu.help.about': 'About',
        'panel.description': 'Description Text',
        'panel.stitch_list': 'Stitch List',
        'panel.element_list': 'Element List',
        'panel.properties': 'Properties',
        'panel.canvas_text': 'Canvas Text',
        'btn.open': 'Open File',
        'btn.save': 'Save',
        'btn.export': 'Export',
        'btn.zoom_in': 'Zoom In',
        'btn.zoom_out': 'Zoom Out',
        'btn.zoom_fit': 'Fit Window',
        'btn.zoom_100': 'Actual Size',
        'btn.add_background': 'Add Background',
        'btn.convert': 'Convert Format',
        'btn.contact': 'Contact',
        'btn.cancel': 'Cancel',
        'btn.confirm': 'Confirm',
        'modal.format_conversion': 'Format Conversion',
        'placeholder.description': 'Enter description text...',
        'label.filename': 'Filename',
        'label.size': 'Size',
        'label.stitches': 'Stitches',
        'label.colors': 'Colors',
        'label.format': 'Format',
        'label.last_modified': 'Last Modified',
        'label.file_size': 'File Size',
        'label.playback_speed': 'Playback Speed',
        'label.select_target_format': 'Select Target Format',
        'label.email': 'Email',
        'label.phone': 'Phone',
        'label.website': 'Website',
        'btn.play': 'Play',
        'btn.pause': 'Pause',
        'btn.reset': 'Reset',
        'msg.no_file': 'No file opened',
        'msg.open_success': 'File opened successfully',
        'msg.open_failed': 'Failed to open file',
        'msg.save_success': 'Saved successfully',
        'msg.save_failed': 'Failed to save',
        'msg.export_success': 'Exported successfully',
        'msg.export_failed': 'Failed to export',
        'msg.contact_message': 'If you have any questions or suggestions, please contact us through:',
        'welcome.dialog_title': 'Welcome to EDVC',
        'welcome.title': 'Embroidery Design Viewer and Converter',
        'welcome.message': 'Welcome to EDVC - Professional embroidery design viewing and conversion tool!',
        'welcome.feature1': 'Support for multiple embroidery file formats (DST, PES, JEF, EXP, VP3, PEC, XXX, SEW, etc.)',
        'welcome.feature2': 'Real-time preview and editing of embroidery designs',
        'welcome.feature3': 'Format conversion and image export functionality',
        'welcome.feature4': 'Multi-language interface support (Chinese, English, Spanish)',
        'welcome.feature5': 'Support for adding background images (including SVG vector graphics)',
        'welcome.get_started': 'Click the "Open" button to get started!',
        'format.dst': 'DST (Tajima)',
        'format.pes': 'PES (Brother)',
        'format.jef': 'JEF (Janome)',
        'format.exp': 'EXP (Melco)',
        'format.vp3': 'VP3 (Pfaff)',
        'format.pec': 'PEC (Brother)',
        'format.xxx': 'XXX (Singer)',
        'format.sew': 'SEW (Janome)',
        'format.dsb': 'DSB (Barudan)',
        'format.u01': 'U01 (Barudan)',
        'format.tbf': 'TBF (Tajima)',
    },
    'es': {
        'app.title': 'Visor y Convertidor de Diseños de Bordado',
        'menu.file': 'Archivo',
        'menu.file.open': 'Abrir',
        'menu.file.save': 'Guardar',
        'menu.file.export_image': 'Exportar Imagen',
        'menu.edit': 'Editar',
        'menu.edit.undo': 'Deshacer',
        'menu.edit.redo': 'Rehacer',
        'menu.edit.copy': 'Copiar',
        'menu.edit.paste': 'Pegar',
        'menu.view': 'Ver',
        'menu.view.minimap': 'Mini mapa',
        'menu.view.description': 'Descripción',
        'menu.view.stitch_list': 'Lista de Puntos',
        'menu.format': 'Formato',
        'menu.format.convert': 'Convertir Formato',
        'menu.help': 'Ayuda',
        'menu.help.about': 'Acerca de',
        'panel.description': 'Texto de Descripción',
        'panel.stitch_list': 'Lista de Puntos',
        'panel.element_list': 'Lista de Elementos',
        'panel.properties': 'Propiedades',
        'panel.canvas_text': 'Texto del Canvas',
        'btn.open': 'Abrir Archivo',
        'btn.save': 'Guardar',
        'btn.export': 'Exportar',
        'btn.zoom_in': 'Acercar',
        'btn.zoom_out': 'Alejar',
        'btn.zoom_fit': 'Ajustar Ventana',
        'btn.zoom_100': 'Tamaño Real',
        'btn.add_background': 'Agregar Fondo',
        'btn.convert': 'Convertir Formato',
        'btn.contact': 'Contacto',
        'btn.cancel': 'Cancelar',
        'btn.confirm': 'Confirmar',
        'modal.format_conversion': 'Conversión de Formato',
        'placeholder.description': 'Ingrese texto de descripción...',
        'label.filename': 'Nombre de Archivo',
        'label.size': 'Tamaño',
        'label.stitches': 'Puntos',
        'label.colors': 'Colores',
        'label.format': 'Formato',
        'label.last_modified': 'Última Modificación',
        'label.file_size': 'Tamaño del Archivo',
        'label.playback_speed': 'Velocidad de Reproducción',
        'label.select_target_format': 'Seleccionar Formato Destino',
        'label.email': 'Correo electrónico',
        'label.phone': 'Teléfono',
        'label.website': 'Sitio web',
        'btn.play': 'Reproducir',
        'btn.pause': 'Pausar',
        'btn.reset': 'Reiniciar',
        'msg.no_file': 'Ningún archivo abierto',
        'msg.open_success': 'Archivo abierto con éxito',
        'msg.open_failed': 'Error al abrir archivo',
        'msg.save_success': 'Guardado con éxito',
        'msg.save_failed': 'Error al guardar',
        'msg.export_success': 'Exportado con éxito',
        'msg.export_failed': 'Error al exportar',
        'msg.contact_message': 'Si tiene alguna pregunta o sugerencia, por favor contáctenos a través de:',
        'welcome.dialog_title': 'Bienvenido a EDVC',
        'welcome.title': 'Visor y Convertidor de Diseños de Bordado',
        'welcome.message': '¡Bienvenido a EDVC - Herramienta profesional de visualización y conversión de diseños de bordado!',
        'welcome.feature1': 'Soporte para múltiples formatos de archivos de bordado (DST, PES, JEF, EXP, VP3, PEC, XXX, SEW, etc.)',
        'welcome.feature2': 'Vista previa y edición en tiempo real de diseños de bordado',
        'welcome.feature3': 'Funcionalidad de conversión de formato y exportación de imágenes',
        'welcome.feature4': 'Soporte de interfaz multilingüe (chino, inglés, español)',
        'welcome.feature5': 'Soporte para agregar imágenes de fondo (incluyendo gráficos vectoriales SVG)',
        'welcome.get_started': '¡Haga clic en el botón "Abrir" para comenzar!',
        'format.dst': 'DST (Tajima)',
        'format.pes': 'PES (Brother)',
        'format.jef': 'JEF (Janome)',
        'format.exp': 'EXP (Melco)',
        'format.vp3': 'VP3 (Pfaff)',
        'format.pec': 'PEC (Brother)',
        'format.xxx': 'XXX (Singer)',
        'format.sew': 'SEW (Janome)',
        'format.dsb': 'DSB (Barudan)',
        'format.u01': 'U01 (Barudan)',
        'format.tbf': 'TBF (Tajima)',
    }
}

current_file_info = {
    'filename': '',
    'filepath': '',
    'format': '',
    'stitches': 0,
    'colors': 0,
    'width': 0,
    'height': 0,
    'description': '',
    'elements': []
}

description_texts = []
stitch_list_data = []
background_image = None
canvas_texts = []


def t(key: str, lang: str = None) -> str:
    lang = lang or LANGUAGE
    return TRANSLATIONS.get(lang, {}).get(key, key)


def set_language(lang: str):
    global LANGUAGE
    LANGUAGE = lang


@app.route('/')
def index():
    return render_template('index.html', 
                          translations=TRANSLATIONS,
                          current_lang=LANGUAGE)


@app.route('/api/language', methods=['GET'])
def get_language():
    return jsonify({
        'success': True,
        'language': LANGUAGE,
        'translations': TRANSLATIONS.get(LANGUAGE, {})
    })


@app.route('/api/language', methods=['POST'])
def set_language_api():
    global LANGUAGE
    data = request.get_json()
    lang = data.get('language', 'zh')
    if lang in TRANSLATIONS:
        LANGUAGE = lang
        return jsonify({
            'success': True,
            'language': LANGUAGE,
            'translations': TRANSLATIONS.get(LANGUAGE, {})
        })
    return jsonify({'success': False, 'error': 'Unsupported language'})


@app.route('/api/formats', methods=['GET'])
def get_supported_formats():
    formats = []
    for fmt in SUPPORTED_FORMATS:
        formats.append({
            'value': fmt,
            'label': t(f'format.{fmt}', 'en'),
            'label_local': t(f'format.{fmt}')
        })
    return jsonify({
        'success': True,
        'formats': formats
    })


@app.route('/api/open', methods=['POST'])
def open_file():
    global current_file_info, description_texts, stitch_list_data
    
    try:
        # 导入必要的模块
        import os
        import time
        
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': t('msg.no_file')})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': t('msg.no_file')})
        
        temp_dir = tempfile.mkdtemp()
        filepath = os.path.join(temp_dir, file.filename)
        file.save(filepath)
        
        filename = os.path.splitext(file.filename)[0]
        file_ext = os.path.splitext(file.filename)[1].lower().replace('.', '')
        
        canvas.clear()
        description_texts = []
        stitch_list_data = []
        
        elements = []
        color_blocks = []
        
        # 定义颜色列表，用于为没有颜色信息的格式生成唯一颜色
        colors = [
            '#e60012', '#ff6b00', '#ffd700', '#7cba00', '#00a651',
            '#00b5ad', '#00a0e9', '#0068b7', '#1d2088', '#601986',
            '#9b59b6', '#e91e63', '#f06292', '#ff5722', '#795548',
            '#607d8b', '#8d6e63', '#4caf50', '#2196f3', '#ff9800'
        ]
        
        # 定义需要特殊处理的格式（可能没有颜色信息）
        formats_without_color_info = ['dst', 'exp', 'dsb', 'u01', 'tbf']
        
        if CORE_AVAILABLE:
            # 使用 embroidery_studio/core 的 EmbroideryReader
            pattern = read_embroidery(filepath)
            
            # 获取针迹块
            blocks = pattern.get_stitch_blocks()
            
            # 对于所有格式，我们都根据块索引来分配颜色，确保每个块都有不同的颜色
            # 这样可以解决 DST 文件颜色索引总是 0 的问题
            for i, block in enumerate(blocks):
                points = []
                for stitch in block.stitches:
                    if stitch.command != 1:  # 跳过跳针
                        points.append((stitch.x / 10.0, stitch.y / 10.0))
                
                if points:
                    # 总是根据块索引分配颜色，确保每个块都有不同的颜色
                    color = colors[i % len(colors)]
                    color_blocks.append({
                        'points': points,
                        'color': color
                    })
        else:
            # 回退到 pyembroidery
            import pyembroidery as pe
            pattern = pe.read(filepath)
            if pattern is None:
                return jsonify({'success': False, 'error': t('msg.open_failed')})
            
            stitches = pattern.stitches
            points = []
            color_index = 0
            
            for stitch in stitches:
                x, y, cmd = stitch
                x = x / 10.0
                y = y / 10.0
                
                if cmd == pe.COLOR_CHANGE:
                    if points:
                        # 根据颜色索引分配颜色，每个换色码对应一个颜色
                        color = colors[color_index % len(colors)]
                        color_blocks.append({
                            'points': points.copy(),
                            'color': color
                        })
                        points = []
                        color_index += 1
                elif cmd == pe.STITCH:
                    points.append((x, y))
                elif cmd == pe.JUMP:
                    pass
            
            if points:
                # 为最后一个块分配颜色
                color = colors[color_index % len(colors)]
                color_blocks.append({
                    'points': points,
                    'color': color
                })
        
        # 构建元素
        for i, block in enumerate(color_blocks):
            if len(block['points']) >= 2:
                elem = {
                    'id': i + 1,
                    'type': 'path',
                    'points': [{'x': p[0], 'y': p[1]} for p in block['points']],
                    'fill': None,
                    'stroke': block['color'],
                    'strokeWidth': 1,
                    'visible': True,
                    'locked': False,
                    'name': f'Element {i + 1}'
                }
                elements.append(elem)
        
        all_x = []
        all_y = []
        for el in elements:
            for p in el['points']:
                all_x.append(p['x'])
                all_y.append(p['y'])
        
        width = max(all_x) - min(all_x) + 100 if all_x else 800
        height = max(all_y) - min(all_y) + 100 if all_y else 600
        
        # 获取文件信息
        
        # 获取文件大小
        file_size = os.path.getsize(filepath)
        # 格式化文件大小
        def format_file_size(size):
            if size < 1024:
                return f"{size} B"
            elif size < 1024 * 1024:
                return f"{size / 1024:.2f} KB"
            else:
                return f"{size / (1024 * 1024):.2f} MB"
        
        # 获取最后修改日期
        last_modified_timestamp = os.path.getmtime(filepath)
        last_modified = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(last_modified_timestamp))
        
        current_file_info = {
            'filename': filename,
            'filepath': filepath,
            'format': file_ext.upper(),
            'stitches': sum(len(block['points']) for block in color_blocks),
            'colors': len(set(block['color'] for block in color_blocks)),
            'width': width,
            'height': height,
            'last_modified': last_modified,
            'file_size': format_file_size(file_size),
            'description': '',
            'elements': elements
        }
        
        for i, block in enumerate(color_blocks):
            stitch_list_data.append({
                'id': i + 1,
                'color': block['color'],
                'stitch_count': len(block['points']),
                'name': f'Block {i + 1}'
            })
        
        return jsonify({
            'success': True,
            'message': t('msg.open_success'),
            'file_info': current_file_info,
            'elements': elements,
            'stitch_list': stitch_list_data
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/convert', methods=['POST'])
def convert_format():
    global current_file_info
    
    try:
        data = request.get_json()
        target_format = data.get('format', 'dst').lower()
        
        if not current_file_info['filepath']:
            return jsonify({'success': False, 'error': t('msg.no_file')})
        
        temp_dir = tempfile.mkdtemp()
        output_filename = f"{current_file_info['filename']}.{target_format}"
        output_path = os.path.join(temp_dir, output_filename)
        
        if CORE_AVAILABLE:
            # 使用 embroidery_studio/core 的 EmbroideryWriter
            # 首先读取原始文件
            pattern = read_embroidery(current_file_info['filepath'])
            
            # 创建 EmbroideryWriter
            writer = EmbroideryWriter()
            
            # 渲染元素
            elements = current_file_info.get('elements', [])
            writer.render_elements(elements)
            
            # 导出到目标格式
            success = writer.export(output_path)
            
            if not success:
                # 回退到 pyembroidery
                import pyembroidery as pe
                pattern = pe.read(current_file_info['filepath'])
                if pattern is None:
                    return jsonify({'success': False, 'error': t('msg.open_failed')})
                pe.write(pattern, output_path)
        else:
            # 回退到 pyembroidery
            import pyembroidery as pe
            pattern = pe.read(current_file_info['filepath'])
            if pattern is None:
                return jsonify({'success': False, 'error': t('msg.open_failed')})
            pe.write(pattern, output_path)
        
        return jsonify({
            'success': True,
            'message': t('msg.export_success'),
            'file_url': f'/download?file={output_path}',
            'filename': output_filename
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/export/image', methods=['POST'])
def export_image():
    global current_file_info
    
    try:
        data = request.get_json() or {}
        image_format = data.get('format', 'png')
        scale = data.get('scale', 2)
        
        if not current_file_info['elements']:
            return jsonify({'success': False, 'error': t('msg.no_file')})
        
        from PIL import Image, ImageDraw
        
        width = int(current_file_info['width'] * scale)
        height = int(current_file_info['height'] * scale)
        
        img = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(img)
        
        for elem in current_file_info['elements']:
            points = [(int(p['x'] * scale), int(p['y'] * scale)) for p in elem['points']]
            if len(points) >= 2:
                color = elem.get('stroke', '#000000')
                draw.line(points, fill=color, width=max(1, int(scale)))
        
        temp_dir = tempfile.mkdtemp()
        output_filename = f"{current_file_info['filename']}.{image_format}"
        output_path = os.path.join(temp_dir, output_filename)
        
        img.save(output_path)
        
        return jsonify({
            'success': True,
            'message': t('msg.export_success'),
            'file_url': f'/download?file={output_path}',
            'filename': output_filename
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/description', methods=['GET'])
def get_descriptions():
    return jsonify({
        'success': True,
        'descriptions': description_texts
    })


@app.route('/api/description', methods=['POST'])
def add_description():
    global description_texts
    
    data = request.get_json()
    text = data.get('text', '')
    style = data.get('style', {})
    
    desc = {
        'id': len(description_texts) + 1,
        'text': text,
        'style': style,
        'created_at': datetime.now().isoformat()
    }
    description_texts.append(desc)
    
    return jsonify({
        'success': True,
        'description': desc
    })


@app.route('/api/description/<int:desc_id>', methods=['PUT'])
def update_description(desc_id):
    global description_texts
    
    data = request.get_json()
    
    for desc in description_texts:
        if desc['id'] == desc_id:
            desc['text'] = data.get('text', desc['text'])
            desc['style'] = data.get('style', desc['style'])
            desc['updated_at'] = datetime.now().isoformat()
            return jsonify({
                'success': True,
                'description': desc
            })
    
    return jsonify({'success': False, 'error': 'Description not found'})


@app.route('/api/description/<int:desc_id>', methods=['DELETE'])
def delete_description(desc_id):
    global description_texts
    
    for i, desc in enumerate(description_texts):
        if desc['id'] == desc_id:
            del description_texts[i]
            return jsonify({'success': True})
    
    return jsonify({'success': False, 'error': 'Description not found'})


@app.route('/api/stitch-list', methods=['GET'])
def get_stitch_list():
    return jsonify({
        'success': True,
        'stitch_list': stitch_list_data
    })


@app.route('/api/stitch-list/insert', methods=['POST'])
def insert_stitch_to_description():
    global description_texts, stitch_list_data
    
    data = request.get_json()
    desc_id = data.get('description_id')
    stitch_id = data.get('stitch_id')
    
    stitch_info = None
    for s in stitch_list_data:
        if s['id'] == stitch_id:
            stitch_info = s
            break
    
    if not stitch_info:
        return jsonify({'success': False, 'error': 'Stitch not found'})
    
    stitch_text = f"[Block {stitch_info['id']}] Color: {stitch_info['color']}, Stitches: {stitch_info['stitch_count']}"
    
    for desc in description_texts:
        if desc['id'] == desc_id:
            desc['text'] += '\n' + stitch_text
            return jsonify({
                'success': True,
                'description': desc
            })
    
    return jsonify({'success': False, 'error': 'Description not found'})


@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    return jsonify({
        'success': True,
        'statistics': {
            'filename': current_file_info['filename'],
            'format': current_file_info['format'],
            'stitch_count': current_file_info['stitches'],
            'color_count': current_file_info['colors'],
            'width': current_file_info['width'],
            'height': current_file_info['height']
        }
    })


@app.route('/api/zoom', methods=['POST'])
def zoom_canvas():
    data = request.get_json()
    zoom_level = data.get('level', 1.0)
    center_x = data.get('center_x', 0)
    center_y = data.get('center_y', 0)
    
    return jsonify({
        'success': True,
        'zoom_level': zoom_level,
        'center': {'x': center_x, 'y': center_y}
    })


@app.route('/api/minimap', methods=['GET'])
def get_minimap():
    global current_file_info
    
    if not current_file_info['elements']:
        return jsonify({
            'success': True,
            'minimap': None,
            'bounds': None
        })
    
    all_x = []
    all_y = []
    for elem in current_file_info['elements']:
        for p in elem['points']:
            all_x.append(p['x'])
            all_y.append(p['y'])
    
    if not all_x:
        return jsonify({
            'success': True,
            'minimap': None,
            'bounds': None
        })
    
    bounds = {
        'min_x': min(all_x),
        'min_y': min(all_y),
        'max_x': max(all_x),
        'max_y': max(all_y),
        'width': max(all_x) - min(all_x),
        'height': max(all_y) - min(all_y)
    }
    
    return jsonify({
        'success': True,
        'elements': current_file_info['elements'],
        'bounds': bounds
    })


@app.route('/download')
def download():
    file_path = request.args.get('file', '')
    
    if not file_path or not os.path.exists(file_path):
        return "File not found", 404
    
    filename = os.path.basename(file_path)
    return send_file(file_path, as_attachment=True, download_name=filename)


@app.route('/api/about', methods=['GET'])
def get_about():
    return jsonify({
        'success': True,
        'about': {
            'name': 'EDVC - Embroidery Design Viewer and Converter',
            'version': '1.0.0',
            'description': t('app.title'),
            'author': 'EMB-Editor',
            'email': 'EMB-Editor@18146125@qq.com'
        }
    })


@app.route('/api/background', methods=['POST'])
def upload_background():
    global background_image
    
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})
        
        import io
        import base64
        
        # 检查是否是SVG文件
        is_svg = file.filename.lower().endswith('.svg')
        
        if is_svg:
            # 处理SVG文件
            svg_content = file.read()
            svg_base64 = base64.b64encode(svg_content).decode('utf-8')
            
            background_image = {
                'data': svg_base64,
                'filename': file.filename,
                'width': 800,  # SVG默认尺寸
                'height': 600,
                'opacity': float(request.form.get('opacity', 0.5)),
                'is_svg': True
            }
        else:
            # 处理普通图片文件
            from PIL import Image
            
            img = Image.open(io.BytesIO(file.read()))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            buffered = io.BytesIO()
            img.save(buffered, format='PNG')
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            
            background_image = {
                'data': f'data:image/png;base64,{img_base64}',
                'filename': file.filename,
                'width': img.width,
                'height': img.height,
                'opacity': float(request.form.get('opacity', 0.5)),
                'is_svg': False
            }
        
        return jsonify({
            'success': True,
            'background': background_image
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/background', methods=['GET'])
def get_background():
    return jsonify({
        'success': True,
        'background': background_image
    })


@app.route('/api/background', methods=['DELETE'])
def remove_background():
    global background_image
    background_image = None
    return jsonify({'success': True})


@app.route('/api/canvas-text', methods=['POST'])
def add_canvas_text():
    global canvas_texts
    
    data = request.get_json()
    
    text_item = {
        'id': len(canvas_texts) + 1,
        'text': data.get('text', ''),
        'x': float(data.get('x', 0)),
        'y': float(data.get('y', 0)),
        'fontFamily': data.get('fontFamily', 'Arial'),
        'fontSize': int(data.get('fontSize', 14)),
        'color': data.get('color', '#000000'),
        'rotation': float(data.get('rotation', 0)),
        'visible': True
    }
    
    canvas_texts.append(text_item)
    
    return jsonify({
        'success': True,
        'text': text_item
    })


@app.route('/api/canvas-text', methods=['GET'])
def get_canvas_texts():
    return jsonify({
        'success': True,
        'texts': canvas_texts
    })


@app.route('/api/canvas-text/<int:text_id>', methods=['PUT'])
def update_canvas_text(text_id):
    global canvas_texts
    
    data = request.get_json()
    
    for text_item in canvas_texts:
        if text_item['id'] == text_id:
            text_item['text'] = data.get('text', text_item['text'])
            text_item['x'] = float(data.get('x', text_item['x']))
            text_item['y'] = float(data.get('y', text_item['y']))
            text_item['fontFamily'] = data.get('fontFamily', text_item['fontFamily'])
            text_item['fontSize'] = int(data.get('fontSize', text_item['fontSize']))
            text_item['color'] = data.get('color', text_item['color'])
            text_item['rotation'] = float(data.get('rotation', text_item['rotation']))
            return jsonify({
                'success': True,
                'text': text_item
            })
    
    return jsonify({'success': False, 'error': 'Text not found'})


@app.route('/api/canvas-text/<int:text_id>', methods=['DELETE'])
def delete_canvas_text(text_id):
    global canvas_texts
    
    for i, text_item in enumerate(canvas_texts):
        if text_item['id'] == text_id:
            del canvas_texts[i]
            return jsonify({'success': True})
    
    return jsonify({'success': False, 'error': 'Text not found'})


@app.route('/api/export/canvas', methods=['POST'])
def export_canvas():
    global current_file_info
    
    try:
        data = request.get_json() or {}
        image_format = data.get('format', 'png')
        scale = data.get('scale', 2)
        canvas_texts = data.get('texts', [])
        background_data = data.get('background', None)
        elements = data.get('elements', current_file_info.get('elements', []))
        
        from PIL import Image, ImageDraw, ImageFont
        import base64
        import io
        
        all_x = []
        all_y = []
        for elem in elements:
            if elem.get('points'):
                for p in elem['points']:
                    all_x.append(p['x'])
                    all_y.append(p['y'])
        
        if all_x and all_y:
            min_x = min(all_x)
            min_y = min(all_y)
            max_x = max(all_x)
            max_y = max(all_y)
            content_width = max_x - min_x
            content_height = max_y - min_y
        else:
            min_x = min_y = 0
            content_width = 800
            content_height = 600
        
        padding = 50
        width = int((content_width + padding * 2) * scale)
        height = int((content_height + padding * 2) * scale)
        
        img = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(img)
        
        if background_data and background_data.get('data'):
            try:
                bg_base64 = background_data['data'].split(',')[1] if ',' in background_data['data'] else background_data['data']
                bg_bytes = base64.b64decode(bg_base64)
                bg_img = Image.open(io.BytesIO(bg_bytes))
                bg_img = bg_img.resize((width, height), Image.Resampling.LANCZOS)
                opacity = background_data.get('opacity', 0.5)
                bg_img = bg_img.convert('RGBA')
                alpha = bg_img.split()[3]
                alpha = alpha.point(lambda p: int(p * opacity))
                bg_img.putalpha(alpha)
                img.paste(bg_img, (0, 0), bg_img)
            except Exception as e:
                print(f"Background error: {e}")
        
        offset_x = padding * scale - min_x * scale
        offset_y = padding * scale - min_y * scale
        
        for elem in elements:
            points = [(int(p['x'] * scale + offset_x), int(p['y'] * scale + offset_y)) for p in elem['points']]
            if len(points) >= 2:
                color = elem.get('stroke', '#000000')
                draw.line(points, fill=color, width=max(1, int(scale)))
        
        for text_item in canvas_texts:
            if not text_item.get('visible', True):
                continue
            
            try:
                font_size = int(text_item['fontSize'] * scale)
                chinese_fonts = ['simhei.ttf', 'simsun.ttc', 'microsoftyahei.ttf', 'msyh.ttc', 'arial.ttf']
                font = None
                for font_name in chinese_fonts:
                    try:
                        font = ImageFont.truetype(font_name, font_size)
                        break
                    except:
                        continue
                if font is None:
                    font = ImageFont.load_default()
            except:
                font = ImageFont.load_default()
            
            text_x = text_item.get('x', 0)
            text_y = text_item.get('y', 0)
            
            x = int(text_x * scale + offset_x)
            y = int(text_y * scale + offset_y)
            
            lines = text_item['text'].split('\n')
            for i, line in enumerate(lines):
                draw.text((x, y + i * font_size * 1.2), line, 
                         fill=text_item['color'], font=font)
        
        temp_dir = tempfile.mkdtemp()
        output_filename = f"{current_file_info.get('filename', 'design')}.{image_format}"
        output_path = os.path.join(temp_dir, output_filename)
        
        img.save(output_path)
        
        return jsonify({
            'success': True,
            'message': t('msg.export_success'),
            'file_url': f'/download?file={output_path}',
            'filename': output_filename
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})


if __name__ == '__main__':
    print("=" * 50)
    print("EDVC - Embroidery Design Viewer and Converter")
    print("刺绣设计查看器和转换器")
    print("=" * 50)
    print(f"Supported formats: {', '.join(SUPPORTED_FORMATS).upper()}")
    print(f"Current language: {LANGUAGE}")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=6010)
