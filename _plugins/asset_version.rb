require 'digest'

module Jekyll
  module AssetVersionFilter
    # Stable, content-based URLs let browsers cache files between releases.
    def asset_version(path)
      site = @context.registers[:site]
      source = File.expand_path(site.source)
      file = File.expand_path(path.to_s.sub(%r{\A/}, ''), source)
      unless file.start_with?(source + File::SEPARATOR) && File.file?(file)
        raise ArgumentError, "Asset not found in site source: #{path}"
      end
      version = Digest::SHA256.file(file).hexdigest[0, 12]
      "#{path}?v=#{version}"
    end
  end
end

Liquid::Template.register_filter(Jekyll::AssetVersionFilter)
