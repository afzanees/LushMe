"""
Settings Page for Travel Agency Billing Software
Updated for Dynamic Persistence and Global Styling
"""
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QFrame, QScrollArea, QGridLayout, QPushButton, QDoubleSpinBox, QMessageBox,
    QListWidget, QInputDialog, QSpinBox, QComboBox, QApplication
)
from PyQt6.QtCore import Qt
from utils.config_manager import ConfigManager
from travel_billing_software.utils.api_key_manager import get_api_key_manager

class SettingsPage(QWidget):
    """Settings page for configuring company, invoice, and app appearance."""
    
    def __init__(self, colors, company_info, invoice_config, get_input_style, get_spinbox_style, 
                 get_button_style, get_scrollarea_style, db=None, main_window_ref=None):
        super().__init__()
        self.config_manager = ConfigManager()
        self.api_key_manager = get_api_key_manager()
        
        # Load live data from ConfigManager instead of static arguments
        self.COMPANY_INFO = self.config_manager.get_company_info()
        self.INVOICE_CONFIG = self.config_manager.get_invoice_config()
        self.APP_SETTINGS = self.config_manager.get_app_settings()
        
        # Keep style references (we will regenerate them later)
        self.COLORS = colors
        self.get_input_style = get_input_style
        self.get_spinbox_style = get_spinbox_style
        self.get_button_style = get_button_style
        self.get_scrollarea_style = get_scrollarea_style
        self.db = db
        self.main_window = main_window_ref # Reference to Dashboard to trigger refreshes

        self.init_ui()
    
    def init_ui(self):
        """Initialize the Settings page UI."""
        # Clear existing layout if re-initializing
        if self.layout():
            QWidget().setLayout(self.layout())
            
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(20, 20, 20, 20)
        main_layout.setSpacing(15)

        # Header
        heading = QLabel(f"<h2 style='color:{self.COLORS['accent_secondary']}; font-size: 28px;'>⚙️ Settings</h2>")        
        main_layout.addWidget(heading)
        
        # Scroll area
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet(self.get_scrollarea_style())
        
        settings_widget = QWidget()
        self.content_layout = QVBoxLayout(settings_widget)
        self.content_layout.setSpacing(20)

        # 1. APPLICATION APPEARANCE (New Feature)
        self._create_appearance_section()

        # 2. AI API KEY CONFIGURATION
        self._create_api_key_section()

        # 3. COMPANY SETTINGS
        self._create_company_section()

        # 4. INVOICE SETTINGS
        self._create_invoice_section()

        # 5. DROPDOWN MANAGEMENT
        self._create_dropdown_section()
        
        # Save Button
        save_btn_layout = QHBoxLayout()
        save_btn_layout.addStretch()
        
        save_settings_btn = QPushButton("💾 Save All Settings")
        save_settings_btn.setStyleSheet(self.get_button_style('save'))
        save_settings_btn.setCursor(Qt.CursorShape.PointingHandCursor)

        save_settings_btn.clicked.connect(self.save_all_settings)
        save_btn_layout.addWidget(save_settings_btn)
        
        self.content_layout.addLayout(save_btn_layout)
        self.content_layout.addStretch()
        
        scroll.setWidget(settings_widget)
        main_layout.addWidget(scroll)

    def _create_frame_style(self):
        return f"""
            QFrame {{
                background-color: {self.COLORS['secondary_bg']};
                border-radius: 8px;
                padding: 20px;
                border: 1px solid #333;
            }}
        """

    def _create_appearance_section(self):
        frame = QFrame()
        frame.setStyleSheet(self._create_frame_style())
        layout = QGridLayout(frame)
        
        title = QLabel(f"<b style='color:{self.COLORS['accent_primary']}; font-size:20px;'>🎨 Appearance</b>")        
        layout.addWidget(title, 0, 0, 1, 2)

        # Font Size
        lbl_font = QLabel("Global Font Size (px):")
        lbl_font.setStyleSheet(f"color: {self.COLORS['text_primary']}; font-weight: bold; font-size: 14px;")        
        self.spin_font_size = QSpinBox()
        self.spin_font_size.setRange(8, 24)
        self.spin_font_size.setValue(self.APP_SETTINGS.get('font_size', 12))
        self.spin_font_size.setStyleSheet(self.get_spinbox_style())
        
        layout.addWidget(lbl_font, 1, 0)
        layout.addWidget(self.spin_font_size, 1, 1)

        # Theme Accent (Simple Dropdown for now)
        lbl_theme = QLabel("Accent Color:")
        lbl_theme.setStyleSheet(f"color: {self.COLORS['text_primary']}; font-weight: bold; font-size: 14px;")
        
        self.combo_theme = QComboBox()
        self.combo_theme.addItems(["Purple", "Blue", "Green", "Orange", "Red"])
        
        # Set current accent color selection
        current_theme_color = self.APP_SETTINGS.get('theme_color', '#7c3aed')
        color_map_reverse = {
            "#7c3aed": "Purple",
            "#3b82f6": "Blue",
            "#10b981": "Green",
            "#f97316": "Orange",
            "#ef4444": "Red"
        }
        current_accent_name = color_map_reverse.get(current_theme_color, "Purple")
        self.combo_theme.setCurrentText(current_accent_name)
        
        self.combo_theme.setStyleSheet(f"""
            QComboBox {{ background-color: #333; color: white; padding: 5px; border-radius: 5px; }}
        """)

        layout.addWidget(lbl_theme, 2, 0)
        layout.addWidget(self.combo_theme, 2, 1)
        
        # Note
        note = QLabel("💡 Changes will take effect after restart")
        note.setStyleSheet(f"color: {self.COLORS['text_secondary']}; font-style: italic;")
        layout.addWidget(note, 3, 0, 1, 2)
        
        self.content_layout.addWidget(frame)

    def _create_api_key_section(self):
        """Create API Key configuration section."""
        frame = QFrame()
        frame.setStyleSheet(self._create_frame_style())
        layout = QVBoxLayout(frame)
        
        title = QLabel(f"<b style='color:{self.COLORS['accent_primary']}; font-size:18px;'>🤖 AI Configuration</b>")
        layout.addWidget(title)
        
        description = QLabel(
            "Configure your Google AI API key for AI Features.\n"
            "Get your free API key from: https://aistudio.google.com/app/apikey"
        )
        description.setStyleSheet(f"color: {self.COLORS['text_secondary']}; font-size: 14px; margin-bottom: 10px;")
        description.setWordWrap(True)
        layout.addWidget(description)
        
        # API Key Input Row
        key_layout = QHBoxLayout()
        
        lbl_api_key = QLabel("Google AI API Key:")
        lbl_api_key.setStyleSheet(f"color: {self.COLORS['text_primary']}; font-weight: bold;")
        lbl_api_key.setFixedWidth(150)
        key_layout.addWidget(lbl_api_key)
        
        self.inp_google_api_key = QLineEdit()
        self.inp_google_api_key.setPlaceholderText("Enter your Google AI API key here...")
        self.inp_google_api_key.setEchoMode(QLineEdit.EchoMode.Password)  # Hide the key
        self.inp_google_api_key.setStyleSheet(self.get_input_style())
        
        # Load existing API key if present
        existing_key = self.api_key_manager.get_api_key('google_ai')
        if existing_key:
            self.inp_google_api_key.setText(existing_key)
            self.inp_google_api_key.setPlaceholderText("API key is set (hidden for security)")
        
        key_layout.addWidget(self.inp_google_api_key, 1)
        
        # Show/Hide button
        self.btn_toggle_visibility = QPushButton("👁️")
        self.btn_toggle_visibility.setFixedWidth(50)
        self.btn_toggle_visibility.setStyleSheet(self.get_button_style('add'))
        self.btn_toggle_visibility.setCursor(Qt.CursorShape.PointingHandCursor)
        self.btn_toggle_visibility.setToolTip("Show/Hide API Key")
        self.btn_toggle_visibility.clicked.connect(self._toggle_api_key_visibility)
        key_layout.addWidget(self.btn_toggle_visibility)
        
        # Test button
        btn_test = QPushButton("🧪 Test")
        btn_test.setFixedWidth(80)
        btn_test.setStyleSheet(self.get_button_style('add'))
        btn_test.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_test.setToolTip("Test API Key Connection")
        btn_test.clicked.connect(self._test_api_key)
        key_layout.addWidget(btn_test)
        
        layout.addLayout(key_layout)
        
        # Status label
        self.lbl_api_status = QLabel("")
        self.lbl_api_status.setStyleSheet(f"color: {self.COLORS['text_secondary']}; font-size: 12px; margin-left: 155px;")
        layout.addWidget(self.lbl_api_status)
        
        # Update status based on existing key
        if existing_key:
            self.lbl_api_status.setText("✅ API key is configured")
            self.lbl_api_status.setStyleSheet(f"color: #10b981; font-size: 12px; margin-left: 155px;")
        else:
            self.lbl_api_status.setText("⚠️ No API key configured - AI features will be disabled")
            self.lbl_api_status.setStyleSheet(f"color: #f97316; font-size: 12px; margin-left: 155px;")
        
        self.content_layout.addWidget(frame)
    
    def _toggle_api_key_visibility(self):
        """Toggle visibility of API key input."""
        if self.inp_google_api_key.echoMode() == QLineEdit.EchoMode.Password:
            self.inp_google_api_key.setEchoMode(QLineEdit.EchoMode.Normal)
            self.btn_toggle_visibility.setText("🙈")
        else:
            self.inp_google_api_key.setEchoMode(QLineEdit.EchoMode.Password)
            self.btn_toggle_visibility.setText("👁️")
    
    def _test_api_key(self):
        """Test the API key connection."""
        api_key = self.inp_google_api_key.text().strip()
        
        if not api_key:
            QMessageBox.warning(self, "No API Key", "Please enter an API key first.")
            return
        
        # Show testing message
        self.lbl_api_status.setText("🔄 Testing API key...")
        self.lbl_api_status.setStyleSheet(f"color: {self.COLORS['text_secondary']}; font-size: 12px; margin-left: 155px;")
        QApplication.processEvents()
        
        try:
            # Test the API key with a simple request
            from langchain_google_genai import ChatGoogleGenerativeAI
            
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash-exp",
                api_key=api_key,
                timeout=10
            )
            
            # Simple test query
            response = llm.invoke("Say 'API key is working' in 3 words")
            
            if response:
                self.lbl_api_status.setText("✅ API key is valid and working!")
                self.lbl_api_status.setStyleSheet(f"color: #10b981; font-size: 12px; margin-left: 155px;")
                QMessageBox.information(self, "Success", "API key is valid and working!\n\nYou can now use AI features.")
            else:
                raise Exception("No response from API")
                
        except Exception as e:
            self.lbl_api_status.setText("❌ API key test failed")
            self.lbl_api_status.setStyleSheet(f"color: #ef4444; font-size: 12px; margin-left: 155px;")
            QMessageBox.warning(
                self, 
                "API Key Test Failed", 
                f"Failed to validate API key.\n\nError: {str(e)}\n\nPlease check:\n"
                "1. API key is correct\n"
                "2. Internet connection is working\n"
                "3. API key has proper permissions"
            )


    def _create_company_section(self):
        frame = QFrame()
        frame.setStyleSheet(self._create_frame_style())
        layout = QGridLayout(frame)
        
        title = QLabel(f"<b style='color:{self.COLORS['accent_primary']}; font-size:20px;'>🏢 Company Information</b>")
        layout.addWidget(title, 0, 0, 1, 2)
        
        fields = [
            ("Company Name:", "name"),
            ("Address:", "address"),
            ("Email:", "email"),
            ("Phone:", "phone"),
            ("GST Number:", "gst_number")
        ]
        
        self.company_inputs = {}
        
        for i, (label_text, key) in enumerate(fields, 1):
            lbl = QLabel(label_text)
            lbl.setStyleSheet(f"color: {self.COLORS['text_primary']}; font-weight: bold; font-size: 14px;")
            
            inp = QLineEdit(str(self.COMPANY_INFO.get(key, "")))
            inp.setStyleSheet(self.get_input_style())
            
            layout.addWidget(lbl, i, 0)
            layout.addWidget(inp, i, 1)
            self.company_inputs[key] = inp
            
        self.content_layout.addWidget(frame)

    def _create_invoice_section(self):
        frame = QFrame()
        frame.setStyleSheet(self._create_frame_style())
        layout = QGridLayout(frame)
        
        title = QLabel(f"<b style='color:{self.COLORS['accent_primary']}; font-size:20px;'>📝 Invoice Configuration</b>")        
        layout.addWidget(title, 0, 0, 1, 2)
        
        # Prefix
        layout.addWidget(QLabel("Invoice Prefix:", styleSheet=f"color:{self.COLORS['text_primary']}; font-weight:bold; font-size: 14px;"), 1, 0)        
        self.inp_prefix = QLineEdit(self.INVOICE_CONFIG.get('prefix', 'INV'))
        self.inp_prefix.setStyleSheet(self.get_input_style())
        layout.addWidget(self.inp_prefix, 1, 1)

        # Currency
        layout.addWidget(QLabel("Currency Symbol:", styleSheet=f"color:{self.COLORS['text_primary']}; font-weight:bold; font-size: 14px;"), 2, 0)
        self.inp_currency = QLineEdit(self.INVOICE_CONFIG.get('currency_symbol', '₹'))
        self.inp_currency.setStyleSheet(self.get_input_style())
        layout.addWidget(self.inp_currency, 2, 1)

        # Tax
        layout.addWidget(QLabel("Default Tax Rate (%):", styleSheet=f"color:{self.COLORS['text_primary']}; font-weight:bold; font-size: 14px;"), 3, 0)
        self.spin_tax = QDoubleSpinBox()
        self.spin_tax.setValue(float(self.INVOICE_CONFIG.get('default_tax_rate', 18.0)))
        self.spin_tax.setMaximum(100)
        self.spin_tax.setStyleSheet(self.get_spinbox_style())
        layout.addWidget(self.spin_tax, 3, 1)
        
        self.content_layout.addWidget(frame)

    def _create_dropdown_section(self):
        frame = QFrame()
        frame.setStyleSheet(self._create_frame_style())
        layout = QVBoxLayout(frame)
        
        layout.addWidget(QLabel(f"<b style='color:{self.COLORS['accent_primary']}; font-size:20px;'>📋 Dropdown Management</b>"))
        
        # Helper to create list sections
        def create_list_manager(title, key):
            lbl = QLabel(title)
            lbl.setStyleSheet(f"color: {self.COLORS['text_primary']}; font-weight: bold; font-size: 18px;")            
            layout.addWidget(lbl)
            layout.addWidget(lbl)
            
            row = QHBoxLayout()
            inp = QLineEdit()
            inp.setPlaceholderText(f"Add new {title.lower().strip(':')}...")
            inp.setStyleSheet(self.get_input_style())
            
            btn_add = QPushButton("➕")
            btn_add.setFixedWidth(70)
            btn_add.setStyleSheet(self.get_button_style('add'))
            
            row.addWidget(inp)
            row.addWidget(btn_add)
            layout.addLayout(row)
            
            lst = QListWidget()
            lst.setFixedHeight(200)
            lst.setStyleSheet(f"background: {self.COLORS['primary_bg']}; color: #ddd; border: 1px solid #444; border-radius: 4px;")
            
            # Load items
            items = self.config_manager.get_dropdowns(key)
            lst.addItems(items)
            
            layout.addWidget(lst)
            
            # Remove Button
            btn_remove = QPushButton("➖ Remove Selected")
            btn_remove.setStyleSheet("""
                QPushButton { background-color: #ef4444; color: white; border-radius: 4px; padding: 5px; }
                QPushButton:hover { background-color: #dc2626; }
            """)
            layout.addWidget(btn_remove)
            
            # Logic Connections
            def add_item():
                text = inp.text().strip()
                if text:
                    if self.config_manager.add_dropdown_item(key, text):
                        lst.addItem(text)
                        inp.clear()
                        # Refresh Home page dropdowns if it's suppliers
                        if key == 'suppliers':
                            self._refresh_supplier_dropdowns()
                    else:
                        QMessageBox.warning(self, "Exists", "Item already exists.")
            
            def remove_item():
                row = lst.currentRow()
                if row >= 0:
                    item = lst.item(row).text()
                    if self.config_manager.remove_dropdown_item(key, item):
                        lst.takeItem(row)
                        # Refresh Home page dropdowns if it's suppliers
                        if key == 'suppliers':
                            self._refresh_supplier_dropdowns()

            btn_add.clicked.connect(add_item)
            btn_remove.clicked.connect(remove_item)

        create_list_manager("Suppliers:", "suppliers")
        layout.addSpacing(10)
        
        # === MANAGE TYPES SECTION (Database-backed, identical to Supplier style) ===
        if self.db:
            self._create_types_manager(layout)
        
        self.content_layout.addWidget(frame)
    
    def _create_types_manager(self, parent_layout):
        """Create the Manage Types section - identical to Supplier style (Add & Delete only)."""
        # Section Title
        lbl = QLabel("Manage Types:")
        lbl.setStyleSheet(f"color: {self.COLORS['text_primary']}; font-weight: bold; font-size: 18px;")
        parent_layout.addWidget(lbl)
        
        # Input and Add button row (same as Supplier)
        row = QHBoxLayout()
        self.types_input = QLineEdit()
        self.types_input.setPlaceholderText("Add new type...")
        self.types_input.setStyleSheet(self.get_input_style())
        
        btn_add = QPushButton("➕")
        btn_add.setFixedWidth(70)
        btn_add.setStyleSheet(self.get_button_style('add'))
        btn_add.setCursor(Qt.CursorShape.PointingHandCursor)
        
        row.addWidget(self.types_input)
        row.addWidget(btn_add)
        parent_layout.addLayout(row)
        
        # List widget (same style as Supplier)
        self.types_list = QListWidget()
        self.types_list.setFixedHeight(200)
        self.types_list.setStyleSheet(f"background: {self.COLORS['primary_bg']}; color: #ddd; border: 1px solid #444; border-radius: 4px;")
        
        # Load types from database
        types = self.db.get_dropdown_items('type')
        self.types_list.addItems(types)
        
        parent_layout.addWidget(self.types_list)
        
        # Delete Button (same style as Supplier)
        btn_remove = QPushButton("➖ Remove Selected")
        btn_remove.setStyleSheet("""
            QPushButton { background-color: #ef4444; color: white; border-radius: 4px; padding: 5px; }
            QPushButton:hover { background-color: #dc2626; }
        """)
        btn_remove.setCursor(Qt.CursorShape.PointingHandCursor)
        parent_layout.addWidget(btn_remove)
        
        # Connect button actions
        btn_add.clicked.connect(self._add_type)
        btn_remove.clicked.connect(self._delete_type)
    
    def _add_type(self):
        """Add a new type (same logic as Supplier add)."""
        text = self.types_input.text().strip()
        if not text:
            return
        
        # Check if already exists
        existing_types = self.db.get_dropdown_items('type')
        if text in existing_types:
            QMessageBox.warning(self, "Exists", "Type already exists.")
            return
        
        # Add to database
        if self.db.add_dropdown_item('type', text):
            self.types_list.addItem(text)
            self.types_input.clear()
            self._refresh_all_type_dropdowns()
        else:
            QMessageBox.warning(self, "Error", "Failed to add type.")
    
    def _delete_type(self):
        """Delete the selected type (same logic as Supplier delete)."""
        row = self.types_list.currentRow()
        if row < 0:
            QMessageBox.warning(self, "No Selection", "Please select a type to delete.")
            return
        
        item = self.types_list.item(row).text()
        
        # Confirmation dialog
        reply = QMessageBox.question(
            self, 
            "Confirm Delete", 
            f"Are you sure you want to delete '{item}'?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            if self.db.delete_dropdown_item('type', item):
                self.types_list.takeItem(row)
                self._refresh_all_type_dropdowns()
            else:
                QMessageBox.warning(self, "Error", "Failed to delete type.")
    
    def _refresh_all_type_dropdowns(self):
        """Refresh all Type dropdowns in the application."""
        if not self.main_window:
            return
        
        try:
            # Refresh Home Page Type dropdown
            if hasattr(self.main_window, 'home_page'):
                home_page = self.main_window.home_page
                if hasattr(home_page, 'invoice_form') and hasattr(home_page.invoice_form, 'refresh_type_dropdown'):
                    home_page.invoice_form.refresh_type_dropdown()
            
            # Refresh Reports Page Type filter
            if hasattr(self.main_window, 'reports_page'):
                reports_page = self.main_window.reports_page
                if hasattr(reports_page, 'refresh_type_filter'):
                    reports_page.refresh_type_filter()
        except Exception as e:
            print(f"Warning: Could not refresh type dropdowns: {e}")
    
    def _refresh_supplier_dropdowns(self):
        """Refresh all Supplier dropdowns in the application."""
        if not self.main_window:
            return
        
        try:
            # Refresh Home Page Supplier dropdowns in items table
            if hasattr(self.main_window, 'home_page'):
                home_page = self.main_window.home_page
                if hasattr(home_page, 'items_table') and hasattr(home_page.items_table, 'refresh_supplier_dropdowns'):
                    home_page.items_table.refresh_supplier_dropdowns()
        except Exception as e:
            print(f"Warning: Could not refresh type dropdowns: {e}")
    
    def _refresh_supplier_dropdowns(self):
        """Refresh all Supplier dropdowns in the application."""
        if not self.main_window:
            return
        
        try:
            # Refresh Home Page Supplier dropdowns in items table
            if hasattr(self.main_window, 'home_page'):
                home_page = self.main_window.home_page
                if hasattr(home_page, 'items_table') and hasattr(home_page.items_table, 'refresh_supplier_dropdowns'):
                    home_page.items_table.refresh_supplier_dropdowns()
        except Exception as e:
            print(f"Warning: Could not refresh supplier dropdowns: {e}")

    def save_all_settings(self):
        """Persist all settings to config.json and trigger updates."""
        try:
            # 1. Save API Key (if changed)
            api_key = self.inp_google_api_key.text().strip()
            if api_key:
                if self.api_key_manager.set_api_key('google_ai', api_key):
                    self.lbl_api_status.setText("✅ API key saved successfully")
                    self.lbl_api_status.setStyleSheet(f"color: #10b981; font-size: 12px; margin-left: 155px;")
                else:
                    self.lbl_api_status.setText("⚠️ Failed to save API key")
                    self.lbl_api_status.setStyleSheet(f"color: #f97316; font-size: 12px; margin-left: 155px;")
            
            # 2. Update Company Info
            company_data = {k: v.text() for k, v in self.company_inputs.items()}
            self.config_manager.set_company_info(company_data)

            # 3. Update Invoice Config
            invoice_data = {
                "prefix": self.inp_prefix.text(),
                "currency_symbol": self.inp_currency.text(),
                "default_tax_rate": self.spin_tax.value(),
                "terms": self.INVOICE_CONFIG.get("terms", "") # Preserve terms
            }
            self.config_manager.set_invoice_config(invoice_data)

            # 4. Update App Settings (Font Size)
            new_font_size = self.spin_font_size.value()
            self.config_manager.set_app_setting("font_size", new_font_size)
            
            # 5. Update Accent Color
            accent_color_map = {
                "Purple": "#7c3aed",
                "Blue": "#3b82f6",
                "Green": "#10b981",
                "Orange": "#f97316",
                "Red": "#ef4444"
            }
            selected_accent = self.combo_theme.currentText()
            if selected_accent in accent_color_map:
                theme_color = accent_color_map[selected_accent]
                self.config_manager.set_app_setting("theme_color", theme_color)

            QMessageBox.information(
                self, 
                "Settings Saved", 
                "Settings saved successfully!\n\nPlease restart the application for changes to take full effect."
            )

        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save settings: {e}")
