---
layout: distill
title: Install JAX
date: 2024-03-12
description: Simply install JAX using Conda
tags: jax
categories: setting
---

*이 포스트는 2024년 3월 12일을 기준으로 작성되었습니다.*

Antibody design을 위해 JAX를 설치해야 하는 상황에 생겼다. (pytorch, tensorflow 정도로 끝날 줄 알았는데...)

Conda 환경 생성 후, 공식 홈페이지의 [Installation Guideline](https://jax.readthedocs.io/en/latest/installation.html#nvidia-gpu) 대로 설치를 했다.

{% highlight bash linenos %}
  # Create Conda Environment (python 3.9)
  conda create -n af python=3.9
  conda activate af
{% endhighlight %}

하지만, CUDA 버전 (v11.1)이 너무 낮아, GPU를 인식하지 못하는 문제가 발생하였다.
<details>
  <summary>Trial 1</summary>
    CUDA version이 다음과 같이 다르게 나타났지만(<a href="https://stackoverflow.com/questions/53422407/different-cuda-versions-shown-by-nvcc-and-nvidia-smi">차이가 나는 이유</a>), 11.x라 공식 Guideline인 <a href="https://jax.readthedocs.io/en/latest/installation.html#nvidia-gpu">Installing JAX</a>에서 'CUDA 11 installation' 코드로 설치 시도함.
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

Log 메세지를 통해 CUDA version이 너무 낮음을 알 수 있었다.<br>

<div style="color:red;">CUDA backend failed to initialize: Found cuBLAS version 11201, but JAX was built against version 111103, which is newer. The copy of cuBLAS that is installed must be at least as new as the version against which JAX built. (Set TF_CPP_MIN_LOG_LEVEL=0 and rerun for more info.)<br>
cpu</div>

    <!-- <img width="500" src='{{"/assets/img/blog1_install_jax/jax_check.png" | relative_url}}'>

    <br> -->

</details>

<br>
CUDA 버전을 업데이트 하기 위해 [공식 문서](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html)를 참고하여,

1. 리눅스 버전
2. GPU 모델

확인 후 [CUDA toolkit](https://developer.nvidia.com/cuda-downloads) v12.4와 [cuDNN](https://developer.nvidia.com/rdp/cudnn-archive) v8.9.7 for CUDA 12.x 를 설치하였으나, 어떤 이유에서 인지... 이번에도 GPU를 인식하지 못하는 문제가 발생하였다.
<details>
  <summary>Trial 2</summary>
    <img width="800" src='{{"/assets/img/blog1_install_jax/env_setup.png" | relative_url}}'>

    <br>

{% highlight bash linenos %}
  # in .bash_profile
  export PATH=/usr/local/cuda-12.4/bin${PATH:+:${PATH}}
  export LD_LIBRARY_PATH=/usr/local/cuda-12.4/lib64${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}

  # after save
  source ~/.bash_profile
{% endhighlight %}

    (아마도 CUDA 12.3을 설치하면 되지 않았을까...)
</details>

<br>

그리고 ```conda```를 활용해 설치하는 [방법](https://jax.readthedocs.io/en/latest/installation.html#conda)을 시도했지만, 두 번째 명령어가 어째서인지 먹히지 않았다.

<details>
  <summary>Trial 3</summary>
{% highlight bash linenos %}
  conda install jax -c conda-forge
  conda install jaxlib=*=*cuda* jax cuda-nvcc -c conda-forge -c nvidia
{% endhighlight %}

<div style="color:red;">no matches found: jaxlib=*=*cuda*</div>
    <!-- <img width="500" src='{{"/assets/img/blog1_install_jax/conda_jaxlib_trial.png" | relative_url}}'> -->
</details>

<br>

마지막으로 아래와 같이 시도해서 성공했다.

{% highlight bash linenos %}
# create conda environment
conda create -n af python=3.9
conda activate af
{% endhighlight %}

처음에는 CUDA 12.4 버전을 설치하려고 했지만, ```conda```에서 설치 가능한 [cudnn](https://anaconda.org/anaconda/cudnn) version이 [CUDA 11](https://anaconda.org/nvidia/cuda)을 기반으로 하기 때문에, 11.8 버전을 [기준](https://jax.readthedocs.io/en/latest/installation.html#pip-installation-gpu-cuda-installed-locally-harder)으로 설치하였다.

> JAX currently ships two CUDA wheel variants:
> * CUDA 12.3, cuDNN 8.9, NCCL 2.16
> * CUDA 11.8, cuDNN 8.6, NCCL 2.16

{% highlight bash linenos %}
  # install cuda using conda
  conda install nvidia/label/cuda-11.8.0::cuda

  # install cudnn using conda
  conda install anaconda::cudnn
{% endhighlight %}

그리고 JAX를 conda로 설치했는데, 설치된 jax 버전 (v0.4.25)과 jaxlib 버전 (v0.4.23)이 달라, 이를 맞추기 위해 최종적으로 아래와 같이 설치하였다.

{% highlight bash linenos %}
  # install jax using conda
  conda install jax==0.4.23 -c conda-forge
{% endhighlight %}

이 때 설치되는 jaxlib은 cpu 버전인 것으로 보여 아래와 같이 jaxlib만 pip를 사용해 설치해주었다.

{% highlight bash linenos %}
  # install jaxlib for gpu using conda
  pip install jaxlib==0.4.23+cuda11.cudnn86 -f https://storage.googleapis.com/jax-releases/jax_cuda_releases.html
{% endhighlight %}

<img width="800" src='{{"/assets/img/blog1_install_jax/success.png" | relative_url}}'>