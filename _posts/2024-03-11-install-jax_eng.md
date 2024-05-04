---
layout: post
title: Install JAX GPU version using Conda
date: 2024-03-11
description: Simple Installation of JAX GPU using Conda
tags: jax
categories: setting
comments: true
---

*This post is based on 12th March 2024.*

For Antibody design model, I needed to install JAX.

I tried installing it according to the [official guideline](https://jax.readthedocs.io/en/latest/installation.html#nvidia-gpu). (First, created ```conda``` environment)
{% highlight bash linenos %}
  # Create Conda Environment (python 3.9)
  conda create -n af python=3.9
  conda activate af
{% endhighlight %}

### [Trial 1]
<br>
However, there was an issue where the GPU was not recognized due to the CUDA version (v11.1) being too low.
<details>
  <summary>Detail</summary>
    (Although the CUDA versions are not different )
    The CUDA version appeared differently for each command(<a href="https://stackoverflow.com/questions/53422407/different-cuda-versions-shown-by-nvcc-and-nvidia-smi">Why they are different?</a>), but since it was 11.x, I attempted installation using the 'CUDA 11 installation' code from the official Guideline, <a href="https://jax.readthedocs.io/en/latest/installation.html#nvidia-gpu">Installing JAX</a>.
  {% highlight bash linenos %}
  nvidia-smi{% endhighlight %}
    <img width="800" src='{{"/assets/img/blog1_install_jax/nvidia-smi_results.png" | relative_url}}'>

  {% highlight bash linenos %}
  nvcc --version{% endhighlight %}
    <img width="500" src='{{"/assets/img/blog1_install_jax/nvcc_results.png" | relative_url}}'>

    <br>

{% highlight bash linenos %}
  # CUDA 11 installation
  # Note: wheels only available on linux.
  pip install --upgrade "jax[cuda11_pip]" -f https://storage.googleapis.com/jax-releases/jax_cuda_releases.html
{% endhighlight %}

{% highlight python linenos %}
  python
  from jax.lib import xla_bridge
  print(xla_bridge.get_backend().platform)
{% endhighlight %}

I realized that the CUDA version was too low through the log message.<br>

    <!-- <img width="500" src='{{"/assets/img/blog1_install_jax/jax_check.png" | relative_url}}'>

    <br> -->

</details>
<div style="color:red;">CUDA backend failed to initialize: Found cuBLAS version 11201, but JAX was built against version 111103, which is newer. The copy of cuBLAS that is installed must be at least as new as the version against which JAX built. (Set TF_CPP_MIN_LOG_LEVEL=0 and rerun for more info.)<br>
cpu</div>
<br>

### [Trial 2]
<br>
To update CUDA version, referred the [official documents](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html), I checked

1. Linux version
2. GPU

I attempted installation of [CUDA toolkit](https://developer.nvidia.com/cuda-downloads) v12.4 and [cuDNN](https://developer.nvidia.com/rdp/cudnn-archive) v8.9.7 for CUDA 12.x, but I don't know why... there was the same issue where the GPU was not recognized.
<details>
  <summary>Detail</summary>
    <img width="800" src='{{"/assets/img/blog1_install_jax/env_setup.png" | relative_url}}'>

    <br>

{% highlight bash linenos %}
  # in .bash_profile
  export PATH=/usr/local/cuda-12.4/bin${PATH:+:${PATH}}
  export LD_LIBRARY_PATH=/usr/local/cuda-12.4/lib64${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}

  # after save
  source ~/.bash_profile
{% endhighlight %}
</details>

<br>

### [Trial 3]
<br>
Then, using ```conda```, I attempted other way [JAX Document](https://jax.readthedocs.io/en/latest/installation.html#conda). I don't know why but it was failed.

<details>
  <summary>Detail</summary>
{% highlight bash linenos %}
  conda install jax -c conda-forge
  conda install jaxlib=*=*cuda* jax cuda-nvcc -c conda-forge -c nvidia
{% endhighlight %}
    <!-- <img width="500" src='{{"/assets/img/blog1_install_jax/conda_jaxlib_trial.png" | relative_url}}'> -->
</details>
<div style="color:red;">no matches found: jaxlib=*=*cuda*</div>
<br>

## How to install successfully

I success to install using this way.

{% highlight bash linenos %}
# create conda environment
conda create -n af python=3.9
conda activate af
{% endhighlight %}

Initially, I tried to install CUDA 12.4 version, but since the [cudnn](https://anaconda.org/anaconda/cudnn) version available for installation from ```conda``` is based on [CUDA 11](https://anaconda.org/nvidia/cuda), I installed CUDA 11.8 version
[reference](https://jax.readthedocs.io/en/latest/installation.

> JAX currently ships two CUDA wheel variants:
> * CUDA 12.3, cuDNN 8.9, NCCL 2.16
> * CUDA 11.8, cuDNN 8.6, NCCL 2.16

{% highlight bash linenos %}
  # install cuda using conda
  conda install nvidia/label/cuda-11.8.0::cuda

  # install cudnn using conda
  conda install anaconda::cudnn
{% endhighlight %}

And I installed JAX via ```conda```, but the installed jax version (v0.4.25) and jaxlib version (v0.4.23) were different, so to align them, I finally installed as follows.

{% highlight bash linenos %}
  # install jax using conda
  conda install jax==0.4.23 -c conda-forge
{% endhighlight %}

For the installation of the GPU version of jaxlib, I used pip to install only jaxlib.

{% highlight bash linenos %}
  # install jaxlib for gpu using conda
  pip install jaxlib==0.4.23+cuda11.cudnn86 -f https://storage.googleapis.com/jax-releases/jax_cuda_releases.html
{% endhighlight %}

<img width="800" src='{{"/assets/img/blog1_install_jax/success.png" | relative_url}}'>