#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::{LogicalSize, Manager};

                // Tauri sizes windows in logical pixels, which can exceed the physical
                // screen on high-DPI laptops. Clamp the initial window to the monitor's
                // work area so the whole board and match panel stay reachable.
                if let Some(window) = app.get_webview_window("main") {
                    if let Some(monitor) = window.current_monitor()? {
                        let scale = monitor.scale_factor();
                        let work = monitor.work_area().size.to_logical::<f64>(scale);
                        let width = (work.width - 48.0).clamp(360.0, 1280.0);
                        let height = (work.height - 48.0).clamp(480.0, 900.0);
                        window.set_size(LogicalSize::new(width, height))?;
                        window.center()?;
                    }
                }
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
