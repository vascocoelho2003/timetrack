function getDaysBetweenAlertAndDue(alertDateStr, dueDateStr){
    if(!alertDateStr || !dueDateStr) return null;

    const alertDate = new Date(alertDateStr);
    const dueDate = new Date(dueDateStr);

    const diffInMs = dueDate-alertDate;
    return Math.round(diffInMs / (1000 * 60 * 60 * 24));
}

module.exports = {
    getDaysBetweenAlertAndDue
};