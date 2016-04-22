#### Caltech Pedestrian Dataset Converter
##### Requirements
- Node

##### Download Caltech Pedestrian Dataset
```
bash download.sh
```
This script will download the caltech pedestrian dataset in a folder called ```data```

##### Extract Dataset
```
npm install
node caltech_pd.js
```

Each .seq movie is separated into images and stored in a folder called ```images``` arranged by the original set and sequence file names. According to the official site, set06~set10 are for test dataset, while the rest are for training dataset.

