import numpy as np
from sklearn.metrics import roc_curve, auc
import matplotlib.pyplot as plt

# 1. Your collected data
# distances = similarity scores from FAISS
# labels = 1 (same person), 0 (different person)

distances = np.array([0.32, 0.28, 0.75, 0.82])
labels = np.array([1, 1, 0, 0])

# 2. Convert distance → similarity (important!)
scores = -distances  # lower distance = higher similarity

# 3. Compute ROC
fpr, tpr, thresholds = roc_curve(labels, scores)
roc_auc = auc(fpr, tpr)

# 4. Plot
plt.figure()
plt.plot(fpr, tpr, label=f"AUC = {roc_auc:.2f}")
plt.xlabel("False Positive Rate (FAR)")
plt.ylabel("True Positive Rate (TAR)")
plt.title("ROC Curve - Face Recognition System")
plt.legend()
plt.grid()
plt.show()

thresholds = np.linspace(0, 1, 50)
accuracies = []

for t in thresholds:
    preds = (distances < t).astype(int)
    acc = (preds == labels).mean()
    accuracies.append(acc)

plt.figure()
plt.plot(thresholds, accuracies)
plt.xlabel("Threshold")
plt.ylabel("Accuracy")
plt.title("Accuracy vs Threshold")
plt.grid()
plt.show()