export const metadata = {
title: "Mamabot Portable",
description: "Portable personal agent workbench"
};

export default function RootLayout({ children }) {
return (
<html lang="ko">
<body>{children}</body>
</html>
);
}