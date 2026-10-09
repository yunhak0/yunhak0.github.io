require 'fileutils'

# Keep previously shared and indexed CV links working when the dated source changes.
Jekyll::Hooks.register :site, :post_write do |site|
  source_root = File.expand_path(site.source)
  cv_path = site.config.fetch('editorial_cv').sub(%r{\A/}, '')
  source = File.expand_path(cv_path, source_root)
  unless source.start_with?(source_root + File::SEPARATOR) && File.file?(source)
    raise Jekyll::Errors::FatalException, "CV source not found: #{cv_path}"
  end

  destination = File.join(site.dest, 'assets', 'pdf', 'CV_YunhakOh.pdf')
  FileUtils.mkdir_p(File.dirname(destination))
  FileUtils.copy_file(source, destination)
end
